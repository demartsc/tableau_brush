// this code was adapted from an original piece of code provided by Tamas Foldi. 
var CANVAS_SELECTOR, TABLEAU_NULL, convertRowToObject, drawLinks, drawNodes, drawNodesAndLinks, drawSanKeyGraph, errorWrapped, getColumnIndexes, getCurrentViz, getCurrentWorksheet, getTableau, initEditor, makeSanKeyData,
  slice = [].slice,
  interval,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

var parms = new Array;
var xAxisField, yAxisField;


TABLEAU_NULL = '%null%';

//document.domain = 'brilliant-data.net';

getTableau = function() {
   return window.top.tableau || parent.parent.tableau;
};

getCurrentViz = function() {
  return getTableau().VizManager.getVizs()[0];
};

getCurrentWorkbook = function() {
  return getCurrentViz().getWorkbook();
};

getCurrentWorksheet = function() {
  return getCurrentViz().getWorkbook().getActiveSheet().getWorksheets()[0];
};

getCurrentWorksheets = function() {
  return getCurrentViz().getWorkbook().getActiveSheet().getWorksheets();
};

errorWrapped = function(context, fn) {
  return function() {
    var args, err, error;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    try {
      return fn.apply(null, args);
    } catch (error) {
      err = error;
      return console.error("Got error during '", context, "' : ", err.message, err.stack);
    }
  };
};

// ---
// generated by coffee-script 1.9.2
getColumnIndexes = function(table, required_keys) {
  var c, colIdxMaps, fn, j, len, ref;
  colIdxMaps = {};
  ref = table.getColumns();
  for (j = 0, len = ref.length; j < len; j++) {
    c = ref[j];
    fn = c.getFieldName();
    if (indexOf.call(required_keys, fn) >= 0) {
      colIdxMaps[fn] = c.getIndex();
    }
  }
  return colIdxMaps;
};

//converts 
convertRowToObject = function(row, attrs_map) {
  var id, name, o;
  o = {};
  for (name in attrs_map) {
    id = attrs_map[name];
    o[name] = row[id].value;
  }
  return o;
};

//this function is the start of it all and calls/references the above functions
initEditor = function() {
  var onDataLoadError, onDataLoadOk, tableau, updateEditor;
  tableau = getTableau();

  onDataLoadError = function(err) {
    return console.error("Error during Tableau Async request:", err._error.message, err._error.stack);
  };
  onDataLoadOk = errorWrapped("Getting data from Tableau", function(table) {
    var col_indexes, data, row, tableauData;
    //we have hardcoded column indexes here, but there is probably a better way
    //col_indexes = getColumnIndexes(table, ["Order Date", "AGG(SalesRollingAverage)"]);
    col_indexes = getColumnIndexes(table, [xAxisField, yAxisField]);
    //console.log(col_indexes);
    data = (function() {
      var j, len, ref, results;
      ref = table.getData();
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        row = ref[j];
        results.push(convertRowToObject(row, col_indexes));
      }
      return results;
    })();
    //console.log(data);
    tableauData = data; 
    $('#htext').val(JSON.stringify(tableauData)); // trying to save this to a hidden object for later use
    drawBrush(tableauData); // set up base graph with all data
  });


  //on initial load we are going to get workbook parameters and read the two field names from them
  getCurrentWorkbook().getParametersAsync().then(function(parms) {
    // to check on whether parms is loaded correctly
    //console.log(parms);

    //loop through array and set the xAxis and yAxis field names
    for(var i =0; i < parms.length; i++)
    {
        if(parms[i].getName() === 'xAxisField') 
        {
          xAxisField = parms[i].getCurrentValue().value;
        }
        else if(parms[i].getName() === 'yAxisField') 
        {
          yAxisField = parms[i].getCurrentValue().value;
        }
    }

    //on initial load get data and store it // we will need to recall this when the underlying data changes  
    getCurrentWorksheet().getSummaryDataAsync({
      maxRows: 0,
      ignoreSelection: true,
      includeAllColumns: true,
      ignoreAliases: true
    }).then(onDataLoadOk, onDataLoadError);

  //add event listener to the viz don't need this for brush only interaction
  //return getCurrentViz().addEventListener(tableau.TableauEventName.PARAMETER_VALUE_CHANGE, onParmChange);
  });
};


this.appApi = {
  initEditor: initEditor
};