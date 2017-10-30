appServices.factory('Statistics', function($resource, config) {

  function generateStatsFromPeriodWindows(periodWindows) {
    var data = [];
    var i = 0;
    _.each(periodWindows, function(periodWindow) {
      var people = getPeopleFromWindow(periodWindow);
      var weeklyThroughput = getWeeklyThroughput(periodWindow);
      var throughputArray = weeklyThroughput.counts;
      var productivity = calculateProductivity(throughputArray) / people.length;
      var predictability = calculateStdDev(throughputArray) / calculateAverage(throughputArray);
      var week = moment(periodWindow[periodWindow.length - 1].startDate, 'DD/MM/YYYY').add('1', 'week').format('DD/MM/YYYY');

      data.push({
        i: i++,
        week: week,
        identifier: "throughput" + week.replace(/\//g, 'gap'),
        people: people,
        issueCount: weeklyThroughput.issues[weeklyThroughput.issues.length - 1].length,
        bugCount: countBugs(weeklyThroughput.issues[weeklyThroughput.issues.length - 1]),
        magnitudes: weeklyThroughput.magnitudes,
        throughput: throughputArray,
        throughputDates: weeklyThroughput.dates,
        total: ss.sum(throughputArray),
        average: Math.round(calculateAverage(throughputArray)),
        stddev: Math.round(calculateStdDev(throughputArray)),
        productivity: productivity,
        predictability: predictability
      });
    });

    return data;
  }

  function generateStoryStatsFromPeriodWindows(periodWindows) {
    var data = [];
    var i = 0;
    _.each(periodWindows, function(periodWindow) {
      var people = getPeopleFromWindow(periodWindow);
      var weeklyThroughput = getWeeklyThroughput(periodWindow);
      var throughputArray = weeklyThroughput.counts;
      var week = moment(periodWindow[periodWindow.length - 1].startDate, 'DD/MM/YYYY').add('1', 'week').format('DD/MM/YYYY');
      data.push({
        i: i++,
        week: week,
        identifier: "throughput" + week.replace(/\//g, 'gap'),
        people: people,
        issueCount: weeklyThroughput.issues[weeklyThroughput.issues.length - 1].length,
        bugCount: countBugs(weeklyThroughput.issues[weeklyThroughput.issues.length - 1]),
        throughput: throughputArray,
        throughputDates: weeklyThroughput.dates,
        transitions: getTransitionsDuration(weeklyThroughput.issues[weeklyThroughput.issues.length - 1]),
        total: ss.sum(throughputArray),
        average: Math.round(calculateAverage(throughputArray)),
        stddev: Math.round(calculateStdDev(throughputArray))
      });
    });

    return data;
  }

  function getTransitionsDuration(issues) {

    let duration = {
      open: [],
      development: [],
      review: [],
      pm: [],
      qa: []
    };

    let openDuration = 0;
    let developmentDuration = 0;
    let reviewDuration = 0;
    let pmDuration = 0;
    let qaDuration = 0;
    let count = 0;
    _.each(issues, function(issue) {
      _.each(issue.transitions, function(transition) {
        if (transition.from == "Open" || transition.from == "Selected for Development" || transition.from == "Backlog" || transition.from == "Ready for Development" || transition.from == "Reopened") {
          openDuration += transition.duration;
        } else if (transition.from == "In Development") {
          developmentDuration += transition.duration;
        } else if (transition.from == "In Review") {
          reviewDuration += transition.duration;
        } else if (transition.from == "Awaiting PM Review" || transition.from == "In PM Review") {
          pmDuration += transition.duration;
        } else if (transition.from == "Ready for QA") {
          qaDuration += transition.duration;
        } else if (transition.from == "Closed") {} else {
          console.error("Untreated transition: " + transition.from);
        }
        count++;
      });
    });
    duration.open.push(openDuration > 0
      ? openDuration / count
      : 0);
    duration.development.push(developmentDuration > 0
      ? developmentDuration / count
      : 0);
    duration.review.push(reviewDuration > 0
      ? reviewDuration / count
      : 0);
    duration.pm.push(pmDuration > 0
      ? pmDuration / count
      : 0);
    duration.qa.push(qaDuration > 0
      ? qaDuration / count
      : 0);
    return duration;
  }

  function countBugs(issues) {
    var bugCount = 0;
    _.each(issues, function(issue) {
      if (issue.fields.issuetype.name === 'Bug') {
        bugCount++;
      }
    });
    return bugCount;
  }

  function gatherIssueTime(issues) {

    _.each(issues.issueData, function(issue) {
      var startDate;
      _.each(issue.fields.subtasks, function(subtask) {
        console.log("gatherIssueTime " + subtask.fields.issuetype.name);
        if (subtask.fields.issuetype.name === "Design Review Sub-Task") {
          startDate = findStartDate(subtask.self);
        }
      });
      var closureDate = findIssueClosureDate(issue);
      console.log(startDate + ' to ' + closureDate);
    });
  }

  function findStartDate(issueUrl) {
    return "dunno";
  }

  function findIssueClosureDate(issue) {
    _.each(issue.changelog.histories, function(change) {
      _.each(change.items, function(item) {
        if (item.field === 'status' && (item.toString === 'Resolved' || item.toString === 'Closed')) {
          return change.created;
        }
      });
    });
  }

  function createWeekBuckets() {
    var numberOfWeeks = 23;

    // The Graph should show up-to last week, except on Friday where it should include the current week.
    // So we add 2 days to the current date before calculating the endOf the week
    var endOfWeek = moment().add('2', 'days').endOf('week');
    var startOfBucket = moment(endOfWeek).subtract(numberOfWeeks, 'weeks');

    var buckets = [];
    for (var i = 0; i < numberOfWeeks; i++) {
      buckets.push({i: i, startDate: startOfBucket.format('DD/MM/YYYY'), issues: []});
      startOfBucket.add('1', 'week');
    }
    return buckets;
  }

  function generateResolvedStoryBucketsFromIssues(issues) {
    var weekBuckets = createWeekBuckets();
    _.each(issues, function(issue) {
      if (issue.fields.issuetype.name === 'Story') {
        issue.transitions = [];
        var resolutionDate = moment(issue.fields.resolutiondate.substr(0, 10), 'YYYY-MM-DD');
        _.each(weekBuckets, function(bucket) {
          if (resolutionDate.isAfter(moment(bucket.startDate, 'DD/MM/YYYY')) && resolutionDate.isBefore(moment(bucket.startDate, 'DD/MM/YYYY').add('1', 'week'))) {
            let fromTime = new Date(issue.fields.created);
            let histories = issue.changelog.histories;
            for (var i = 0; i < histories.length; i++) {
              let history = histories[i];
              for (var k = 0; k < history.items.length; k++) {
                let item = history.items[k];
                if (item.field == 'status') {
                  let toTime = new Date(history.created);
                  issue.transitions.push({
                    'duration': parseInt((toTime - fromTime) / 1000 / 60 / 60 / 24),
                    'from': item.fromString,
                    'to': item.toString
                  });
                  fromTime = toTime;
                }
              }
            }
            bucket.issues.push(issue);
          }
        });
      }
    });

    return weekBuckets;
  }

  function generateResolvedBucketsFromIssues(issues) {
    var weekBuckets = createWeekBuckets();
    _.each(issues, function(issue) {
      var resolutionDate = moment(issue.fields.resolutiondate.substr(0, 10), 'YYYY-MM-DD');
      _.each(weekBuckets, function(bucket) {
        if (resolutionDate.isAfter(moment(bucket.startDate, 'DD/MM/YYYY')) && resolutionDate.isBefore(moment(bucket.startDate, 'DD/MM/YYYY').add('1', 'week'))) {
          bucket.issues.push(issue);
        }
      });
    });

    return weekBuckets;
  }

  function generateCreatedBucketsFromIssues(issues) {
    var weekBuckets = createWeekBuckets();
    _.each(issues, function(issue) {
      var resolutionDate = moment(issue.fields.created.substr(0, 10), 'YYYY-MM-DD');
      _.each(weekBuckets, function(bucket) {
        if (resolutionDate.isAfter(moment(bucket.startDate, 'DD/MM/YYYY')) && resolutionDate.isBefore(moment(bucket.startDate, 'DD/MM/YYYY').add('1', 'week'))) {
          bucket.issues.push(issue);
        }
      });
    });

    return weekBuckets;
  }

  function getPeriodWindows(weekBuckets) {
    var windows = [];
    for (i = 0; i < weekBuckets.length - 13; i++) {
      windows.push(weekBuckets.slice(i, i + 13));
    }
    return windows;
  }

  function getPeopleFromIssues(issues) {

    var people = [];
    _.each(issues, function(issue) {
      let names = issue.fields["customfield_12020"];
      if (names) {
        for (var i = 0, len = names.length; i < len; i++) {
          name = names[i].split('(')[0];
          if (config.people.indexOf(name) > -1) {
            people.push(name);
          }
        }
      }
    });

    return getUniquePeople(people);
  }

  function getPeopleFromWindow(periodWindow) {
    var people = [];
    _.each(periodWindow, function(periodIssues) {
      _.each(periodIssues.issues, function(issue) {
        let names = issue.fields["customfield_12020"];
        if (names) {
          for (var i = 0, len = names.length; i < len; i++) {
            name = names[i].split('(')[0];
            if (config.people.indexOf(name) > -1) {
              people.push(name);
            }
          }
        }
      });
    });

    return getUniquePeople(people);
  }

  function getUniquePeople(people) {
    var uniquePeople = _.map(_.groupBy(people, function(person) {
      return person;
    }), function(grouped) {
      return grouped[0];
    });

    return uniquePeople;
  }

  function getWeeklyThroughput(periodWindow) {

    var throughput = {
      magnitudes: [],
      counts: [],
      dates: [],
      issues: []
    };

    _.each(periodWindow, function(week) {
      var totalMagnitude = 0;
      for (i = 0; i < week.issues.length; i++) {
        var issue = week.issues[i];
        var magnitude = issue.fields["customfield_10193"];
        if (magnitude) {
          totalMagnitude += magnitude;
        }
      }

      throughput.magnitudes.push(totalMagnitude);
      throughput.counts.push(week.issues.length);
      throughput.issues.push(week.issues);
      throughput.dates.push(week.startDate);
    });

    return throughput;
  }

  function calculateProductivity(throughputArray, people) {
    return (ss.sum(throughputArray) / 13);
  }

  function calculateStdDev(throughputArray) {
    return ss.standard_deviation(throughputArray);
  }

  function calculateAverage(throughputArray) {
    return ss.average(throughputArray);
  }

  function generateGraphDataFromStat(stats) {
    var throughputData = [];
    var peopleData = [];

    var predictabilityData = [];
    var productivityData = [];

    var velocities = [];
    var magnitudes = [];

    for (var i = 0; i < stats.length; i++) {
      var stat = stats[i];
      var throughput = d3.round(stat.throughput[stat.throughput.length - 1]);
      var date = stat.week;
      throughputData.push({
        week: date,
        weekNumber: i + 1,
        type: format(throughput, 'issue', 'issues'),
        value: throughput
      });

      var people = d3.round(stat.people.length);
      peopleData.push({
        week: date,
        weekNumber: i + 1,
        type: 'people',
        value: people
      });

      var totalMagnitude = stat.magnitudes[stat.magnitudes.length - 1];
      magnitudes.push({
        week: date,
        weekNumber: i + 1,
        type: 'points',
        value: totalMagnitude
      });

      var velocity = totalMagnitude / stat.people.length / 5;
      velocities.push({
        week: date,
        weekNumber: i + 1,
        type: 'points/person/day',
        value: velocity
      });

      predictabilityData.push({
        week: date,
        weekNumber: i + 1,
        type: '',
        value: stat.predictability
      });

      productivityData.push({
        week: date,
        weekNumber: i + 1,
        type: '',
        value: stat.productivity
      });
    };

    return {
      throughputPeople: [
        {
          values: throughputData,
          key: 'JIRAs Resolved',
          area: true
        }, {
          values: peopleData,
          key: 'People'
        }, {
          values: magnitudes,
          key: 'Story Points Completed'
        }
      ],

      predictabilityProductivity: [
        {
          values: productivityData,
          key: 'Productivity',
          area: true
        }, {
          values: predictabilityData,
          key: 'Predictability',
          area: true
        }, {
          values: velocities,
          key: 'Velocity',
          area: true
        }
      ]
    };
  };

  function generateGraphStoryDataFromStat(stats) {
    var resolvedStories = [];
    var openDuration = [];
    var developmentDuration = [];
    var reviewDuration = [];
    var pmDuration = [];
    var qaDuration = [];

    for (var i = 0; i < stats.length; i++) {
      var stat = stats[i];
      var throughput = d3.round(stat.throughput[stat.throughput.length - 1]);
      var date = stat.week;

      openDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.open)
      });

      developmentDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.development)
      });

      reviewDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.review)
      });

      pmDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.pm)
      });

      qaDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.qa)
      });
    };

    return {
      resolvedStories: [
        {
          values: openDuration,
          key: 'Open',
          area: true
        }, {
          values: developmentDuration,
          key: 'In Development',
          area: true
        }, {
          values: reviewDuration,
          key: 'In Review',
          area: true
        }, {
          values: pmDuration,
          key: 'In PM',
          area: true
        }, {
          values: qaDuration,
          key: 'In QA',
          area: true
        }
      ]
    };
  };

  function generateCreatedVsResolvedData(createdBuckets, resolvedBuckets) {
    var createdData = [];
    var resolvedData = [];

    function addBucketCountTo(data) {
      var i = 0;
      var previousValue = 0;
      return function(bucket) {
        var count = previousValue + bucket.issues.length;
        previousValue = count;

        var date = bucket.startDate;
        data.push({
          week: date,
          weekNumber: i++,
          type: format(count, 'issue', 'issues'),
          value: count
        });
      }
    }

    _.each(createdBuckets, addBucketCountTo(createdData));
    _.each(resolvedBuckets, addBucketCountTo(resolvedData));

    return [
      {
        values: createdData,
        key: 'Created',
        color: '#d62728',
        //area: true
      }, {
        values: resolvedData,
        key: 'Resolved',
        color: '#2ca02c',
        //area: true
      }
    ]
  }

  function format(count, one, many) {
    return (count == 1
      ? one
      : many);
  }

  function generateStatsFromBuckets(weeklyBuckets) {
    var periodWindows = getPeriodWindows(weeklyBuckets);
    var stats = generateStatsFromPeriodWindows(periodWindows);

    return stats;
  }

  function generateStoryStatsFromBuckets(weeklyBuckets) {
    var periodWindows = getPeriodWindows(weeklyBuckets);
    var stats = generateStoryStatsFromPeriodWindows(periodWindows);

    return stats;
  }

  return {
    generateResolvedStoryBucketsFromIssues: generateResolvedStoryBucketsFromIssues,
    generateStoryStatsFromBuckets: generateStoryStatsFromBuckets,
    generateGraphStoryDataFromStat: generateGraphStoryDataFromStat,
    generateResolvedBucketsFromIssues: generateResolvedBucketsFromIssues,
    generateCreatedBucketsFromIssues: generateCreatedBucketsFromIssues,
    generateStatsFromBuckets: generateStatsFromBuckets,
    generateGraphDataFromStat: generateGraphDataFromStat,
    generateCreatedVsResolvedData: generateCreatedVsResolvedData,
    getPeopleFromIssues: getPeopleFromIssues
  };
});