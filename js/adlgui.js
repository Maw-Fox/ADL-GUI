/**
 * Log searcher by Kali.
 */
(function() {
  var interval = 300;

  var request = superagent;

  var Search = {
    Name: '',
    Query: '',
    loaded: 0,
    loading: 0,
    isLoading: true,
    date: '',
    oldestDate: ''
  };

  var filter = {
    channel: ''
  };

  var domain = 'http://cors.io/?u=http://magic.newtsin.space:32895/access/';
  
  var Logs = [];
  var AllLogs = [];
  var queue = [];

  var currentTime = new Date();

  currentTime.setMinutes(currentTime.getTimezoneOffset()); // UTC
  currentTime.setMinutes(-240); // EST

  var day = currentTime.getDate();
  var month = currentTime.getMonth() + 1;
  var year = currentTime.getFullYear();

  function pad(num, by) {
    num = num + '';
    while(num.length < by) {
      num = '0' + num;
    }
    return num;
  }

  Search.date = `[${year}/${pad(month, 2)}/${pad(day, 2)}]`;
  Search.oldestDate = `[${year}/${pad(month, 2)}/${pad(day, 2)}]`;

  function completeLogURI(y, m, d) {
    return domain + `${year}-${pad(month, 2)}-${pad(day, 2)}/`;
  }

  Search.URI = logURI = completeLogURI(year, month, day);

  function getLogsFor(lURI) {
    request.get(lURI)
      .end(function(error, response) {
        var cLog;
        var channelsLogged = [];
        if (error) {
          alert('Something went wrong!\n' + error.message);
          return;
        }

        channelsLogged = response.text.match(/>[a-z_]+\.txt/gi);

        channelsLogged.forEach(function(v, i, a) {
          a[i] = v.replace('>', '');
        });

        for (var i = 0, ii = channelsLogged.length; i < ii; i++) {
          cLog = Logs[channelsLogged[i].replace('.txt', '')] = {
            fileURI: encodeURI(lURI + channelsLogged[i]),
            messages: []
          }

          Search.loading++

          setTimeout((function(log, wait) {
            function getLog() {
              var lines;
              var charName;
              var fileName = log.fileURI.slice(log.fileURI.lastIndexOf('/'), log.fileURI.length);
              request
                .get(log.fileURI)
                .end(function(error, response) {
                  if (error) {
                    setTimeout(function() {getLog()}, wait);
                    return;
                  }

                  Search.loaded++

                  lines = response.text.match(/^.+$/gmi);

                  if (!lines) {
                    lines = [response.text];
                  }

                  lines.forEach(function(v, i, a) {
                    var idxColon;
                    charName = v.slice(23, v.length);
                    idxColon = charName.indexOf(':');

                    log.messages.push(v);
                    AllLogs.push({
                      timestamp: v.slice(4, 21),
                      fullMessage: v,
                      message: charName.slice(idxColon, charName.length),
                      character: charName.slice(0, idxColon), 
                      file: fileName.slice(1, fileName.length).replace('.txt', ''),
                      line: i,
                      reference: a
                    });
                  });
                });
            }

            return getLog;
          })(cLog, interval + 2500), interval * (i + 1));
        }
      });
  }

  var queueTick = setInterval(function() {
    var lURI;
    
    if (!queue.length) return;
    
    lURI = queue.shift();
    
    getLogsFor(lURI);
  }, interval * 40);

  function addToQueue(lURI) {
    queue.push(lURI);
  };

  var View = new Vue({
    el: '#app',
    data: {
      Search: Search,
      Logs: AllLogs,
      backlog: 0,
      limit: 200,
      channel: '',
      Name: '',
      Query: ''
    },
    computed: {
      filtered: function() {
        return this.Logs
          .filter(function(item) {
            var lItem = item.toLowerCase();

            if (lItem.indexOf(lName) > -1) return true;
            if (lItem.indexOf(lQuery) > -1) return true;
            return false;
        });
      }
    },
    methods: {
      setSubFilter: function(type, value) {
        switch (type) {
          case 'channel':
            View.channel = value;
            break;
          default:
            break;
        }
      },
      removeSubFilter: function(type) {
        this.subFilters[type] = '';
      },
      addBacklog: function() {
        var y, m, d;
        var now = new Date();
        if (View.backlog === 29) return;
        
        View.backlog++
              now.setMinutes(now.getTimezoneOffset()); // UTC
        now.setMinutes(-240 * View.backlog); // EST
        
        now.setHours(-24 * View.backlog);
        
        y = now.getFullYear();
        m = pad(now.getMonth() + 1, 2);
        d = pad(now.getDate(), 2);
        
        addToQueue(`${domain}${y}-${pad(m, 2)}-${pad(d, 2)}/`);
        
        Search.oldestDate = `[${y}/${pad(m, 2)}/${pad(d, 2)}]`;    
      },
      addName: function(ev) {
        Search.Names.push('');
      },
      removeName: function(index) {
        Search.Names.splice(index, 1);
      },
      addQuery: function(ev) {
        Search.Queries.push('');
      },
      removeQuery: function(index) {
        Search.Queries.splice(index, 1);
      },
      runQuery: function() {
        return
      },
      pad: pad
    }
  });

  return getLogsFor(logURI);
}());
