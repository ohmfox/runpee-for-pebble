var request = require("request"),
  rp = require("request-promise"),
  cheerio = require("cheerio"),
  Firebase = require("firebase"),
  baseUrl = "http://m.runpee.com/",
  movies = [],
  DEBUG = true;

function saveMovies() {
  console.log("Saving to Firebase!");
  var mf = new Firebase("https://runpee-pebble.firebaseio.com/");
  console.log(movies);
  mf.set(movies);
  console.log("Done!");
}

var addMovie = function addMovie(data) {
  return {
    url: data[0],
    title: data[1],
    getTimes: function() {
      var self = this;
      return rp(self.url).then(function(data) {
        var $$ = cheerio.load(data);
        var text = $$("body").text().replace("\n", "");
        var re = new RegExp(self.title+"([\\w\\W]*?)<<<");
        var matches = text.match(re);
        var block = matches[1];
        var notes = block.match(/Notes about these Peetimes:(.*?)\n/);
        var timesRe = "PeeTime ([0-9]) of ([0-9])([\\w\\s\\d=]*)When to go:(.*)";
        var times = block.match(new RegExp(timesRe, "g"));
        var outTimes = [];
        for(var i=0;i<times.length;i++) {
          var t = times[i].match(new RegExp(timesRe));
          var time = {
            index: t[1],
            count: t[2],
            time: t[3].trim(),
            when: parseInt(t[3].match(/([0-9]+) minutes into movie =/)[1], 10),
            length: parseInt(t[3].match(/[0-9]+ minutes into movie = ([0-9]+)/)[1], 10),
            whenText: t[4].trim()
          };
          outTimes.push(time);
        }
        return outTimes;
      }).then(function(times) {
        return {
          title: self.title,
          times: times,
          runtime: parseInt(self.url.substring(self.url.indexOf("runningTime=")).replace("runningTime=", ""), 10)
        };
      });
    }
  };
};

function start() {
  rp(baseUrl).then(function(body) {
    var $ = cheerio.load(body);
    var links = $("p a[href^='peeTime']");
    global.len = links.length;
    var movieList = [];
    for(var ind=0;ind<global.len; ind++) {
      var link = links[ind];
      var title = $(link).text();
      var href = $(link).attr("href");
      var url = baseUrl+href;
      movieList.push([url, title]);
    }
    return movieList;
  }).then(function(data) {
    var i = 0;
    function iter() {
      if(i==data.length) {
        saveMovies();
      } else {
        var movie = addMovie(data[i++]);  
        movie.getTimes().then(function(movie) {
          movies.push(movie);
          iter();
        });
      }
    }
    iter();
  });
}
var CronJob = require('cron').CronJob;
var job = new CronJob('00 01 12 * * 1-5', function() {
  start();
}, function () {
},
true, 
'America/Los_Angeles'
);  
