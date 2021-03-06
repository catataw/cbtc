module.exports = function(mongoose, Trade, MinuteBar) {
  // var Trade = require('./trades')(mongoose);
  // var MinuteBar = require('./minute_bar')(mongoose);

  var calculateNewMinuteBar = function (currentTime, timeBack, io) {
    // format data for chartIQ
    var formatted_date = addZero(currentTime.getFullYear() +
        "-" + addZero(currentTime.getMonth() + 1))+ "-" +
        addZero(currentTime.getDate())+ " " + addZero(currentTime.getHours()) +
        ":"+addZero(currentTime.getMinutes());

    console.log(formatted_date);

    var tradeArray = [];
    var lastMinuteOfTrades = undefined;

    // select last minute of trades from database
    Trade.find({'date':{ $gte: new Date(currentTime - timeBack) }})
      // .where('date').gte(currentTime - timeBack)
      .sort({ date: 1 })
      .exec( function (err, docs) {
        if (!err) {
          lastMinuteOfTrades = docs;
          tradeArray.push(lastMinuteOfTrades);

          var newMinuteBar = new MinuteBar();
          newMinuteBar.date = formatted_date;

          // if we have trades, format minbar
          if (docs && lastMinuteOfTrades.length > 0) {
            console.log("found " + lastMinuteOfTrades.length + " since " + newMinuteBar.date);
            // var count = 0;

            newMinuteBar.open = lastMinuteOfTrades[0].price;
            newMinuteBar.close = lastMinuteOfTrades[lastMinuteOfTrades.length - 1 ].price;
            newMinuteBar.volume = 0;

            // loop through trades to calculate low, high, and total volume
            lastMinuteOfTrades.forEach( function(trade) {
              if (newMinuteBar.high === undefined || trade.price > newMinuteBar.high) {
                newMinuteBar.high = trade.price;
              }
              if (newMinuteBar.low === undefined || trade.price < newMinuteBar.low ) {
                newMinuteBar.low = trade.price;
              }
              newMinuteBar.volume += trade.amount;
              // count ++;
            });
          } else {
            // format minbar based on most recent trade
            console.log("was not able to find any trades in last minute");
            Trade.find()
              .sort({ 'date': -1 })
              .limit(1)
              .exec( function (err, docs) {
                if (!err && docs) {
                  lastTrade = docs;

                  // set all relevant trade info to last trade
                  newMinuteBar.high = lastTrade.price;
                  newMinuteBar.low = lastTrade.price;
                  newMinuteBar.volume = 0;
                  newMinuteBar.open = lastTrade.price;
                  newMinuteBar.close = lastTrade.price;
                } else {
                  console.log(err);
                }
              });
            ;
          }
          // save new minbar to mongo database
          newMinuteBar.save( function( err, minbar ) {
            if (err) {
              console.log("Error when saving new MinuteBar");
              console.log(err);
            } else {
              console.log("New MinuteBar created at " + minbar.date);
              console.log(newMinuteBar);
              // send new minbar to chartIQ
              io.sockets.emit('trades', minbar);
            }
          });
        } else {
          console.log(err);
        }
      });
    ;
  };

  var addZero = function(dateObject) {
    if (dateObject.toString().length === 1) {
      return "0" + dateObject ;
    }
    return dateObject;
  };

  var runMinuteBarCalc = function(io) {
    setInterval(function() {
      var date = new Date();
      var time = 60 * 1000;
      calculateNewMinuteBar(date, time, io)
      } , 60 * 1000);
  };

  return runMinuteBarCalc;
}
