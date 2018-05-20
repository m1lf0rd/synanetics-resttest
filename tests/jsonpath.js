const JSONPath = require('../jsonpath');

var testdata={
    'books':[
        {'title':'Catcher In the Rye',
         'author': 'JD Salinger',
         'stock': [
             {'edition':1,
              'published':1959,
              'price':19.95,
              'quantity':3
             },
             {'edition':2,
              'published':1961,
              'price':10.95,
              'quantity':5
             },
             {'edition':3,
              'published':1965,
              'price':9.95,
              'quantity':1
             }
         ]
        },
        {'title':'The Great Gatsby',
         'author': 'Scott Fitzgerald',
         'stock': [
             {'edition':1,
              'published':1925,
              'price':119.25,
              'quantity':1
             },
             {'edition':4,
              'published':1962,
              'price':10.95,
              'quantity':5
             },
             {'edition':7,
              'price':3.50,
              'quantity':2
             }
         ]
        }
    ]
};

var testsimplearray=[1,1,3,5,3,7,7,9,4,4];

var tests = [
    {'description':'Get Property Through Array Index', 'verbose':0,
     'execute': function () {
            return JSONPath.Get('$.books[1].title',testdata);
     },
     'test': function (results) {
            return (results.length==1 && results[0]=='The Great Gatsby');
        }
    },
    {'description':'Get Property Through Array Index With Bounds', 'verbose':0,
     'execute': function () {
            return JSONPath.Get('$.books[0:1].title',testdata);
     },
     'test': function (results) {
            return (results.length==2 && results[0]=='Catcher In the Rye' && results[1]=='The Great Gatsby');
        }
    }
    ,
    {'description':'Get Property Through Array Index With Negative Bounds', 'verbose':0,
     'execute': function () {
            return JSONPath.Get('$.books[0:-1].title',testdata);
     },
     'test': function (results) {
            return (results.length==2 && results[0]=='Catcher In the Rye' && results[1]=='The Great Gatsby');
        }
    },
    {'description':'Get Property Through Array Index With Negative Bounds and Explicit Length', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$.books[0:@length-1].title',testdata);
     },
     'test': function (results) {
           return (results.length==2 && results[0]=='Catcher In the Rye' && results[1]=='The Great Gatsby');
       }
   },
   {'description':'Get Property Through Array Index With Implied Start', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$.books[:@length-1].author',testdata);
     },
     'test': function (results) {
           return (results.length==2 && results[0]=='JD Salinger' && results[1]=='Scott Fitzgerald');
       }
   },
   {'description':'Get Property Through Array Index With Implied End', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$.books[@length-1:].author',testdata);
    },
    'test': function (results) {
           return (results.length==1 && results[0]=='Scott Fitzgerald');
       }
   },
   {'description':'Get Property Through Array Index With Consitional Search', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$.books[0].stock[?(@edition<=2)].price',testdata);
    },
    'test': function (results) {
           return (results.length==2 && results[0]==19.95 && results[1]==10.95);
       }
   },
   {'description':'Maximum Aggregation Function with Wildchar Array Bounds', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$.books[1].stock[*].price.max()',testdata);
    },
    'test': function (results) {
           return (results==119.25);
       }
   },
   {'description':'Minimum Aggregation Function with List Type Array Bounds', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$.books[1].stock[0,2].price.min()',testdata);
    },
    'test': function (results) {
           return (results==3.50);
       }
   },
   {'description':'Alternate Syntax', 'verbose':0,
    'execute': function () {
           return JSONPath.Get('$["books"][1]["stock"][0,2]["price"].min()',testdata);
    },
    'test': function (results) {
           return (results==3.50);
       }
   },
   {'description':'Set All Prices to 1', 'verbose':0,
    'execute': function () {
           var testobj = JSON.parse(JSON.stringify(testdata));
           JSONPath.Set('$["books"][*]["stock"][*]["price"]',testobj,1);
           return testobj;
    },
    'test': function (results) {
        return JSONPath.Get('$["books"][*]["stock"][*]["price"].sum()',results)==6;
       }
    },
   {'description':'Set One Price to 100.00', 'verbose':0,
    'execute': function () {
           var testobj = JSON.parse(JSON.stringify(testdata));
           JSONPath.Set('$.books[?(@author=="JD Salinger")].stock[?(@edition==1)].price',testobj,100);
           return testobj;
    },
    'test': function (results) {
        return JSONPath.Get('$.books[?(@author=="JD Salinger")].stock[*].price.sum()',results)==120.9;
       }
   },
   {'description':'Deep search on price', 'verbose':0,
    'execute': function () {
        return JSONPath.Get('$..price.avg()',testdata);
    },
    'test': function (results) {
        return (results.toFixed(2)==29.09);
       }
   },
   {'description':'Aggregation on a simple array', 'verbose':0,
    'execute': function () {
        return JSONPath.Get('$.std()',testsimplearray);
    },
    'test': function (results) {
        return (results.toFixed(2)==2.50);
       }
   }
     
];

for (var i=0;i<tests.length;i++)
{
    JSONPath.BeNoisy(tests[i].verbose);
    var results = tests[i].execute();
    if (tests[i].verbose) console.log(results);
    var result = tests[i].test(results);
    console.log(tests[i].description+": \x1b["+(result?"32m":"31m")+"%s\x1b[0m",result?"PASS":"FAIL");

}

