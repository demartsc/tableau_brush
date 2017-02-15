// this code was adapted from an original piece of code provided by Tamas Foldi. 
var CANVAS_SELECTOR, TABLEAU_NULL, convertRowToObject, drawLinks, drawNodes, drawNodesAndLinks, drawSanKeyGraph, errorWrapped, getColumnIndexes, getCurrentViz, getCurrentWorksheet, getTableau, initEditor, makeSanKeyData,
  slice = [].slice,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };


TABLEAU_NULL = '%null%';

//document.domain = 'brilliant-data.net';

getTableau = function() {
      return parent.parent.tableau;
};

getCurrentViz = function() {
  return getTableau().VizManager.getVizs()[0];
};

getCurrentWorksheet = function() {
  return getCurrentViz().getWorkbook().getActiveSheet().getWorksheets()[1];
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

convertToNodeLink = function(rows) {
  var all_names, allgroups, groupCache, grp, cache, i, idx, j, k, len, len1, name, nodes, o, row, value;
  all_names = _.pluck(rows, "tweeter");
  all_groups = _.pluck(rows, "Axis");
  //console.log(all_names);
  i = 0;
  cache = {};
  groupCache = {};
  for (j = 0, len = all_names.length; j < len; j++) {
    name = all_names[j];
    if (all_groups[j] === "%null%") {
      grp = "other"
    }
    else{
      grp = all_groups[j];
    };
//    grp = all_groups[j] || "other"; // if the group value is null then we need to set it to other for d3
//    console.log(grp);
    if (!cache.hasOwnProperty(name)) {
      cache[name] = i;
      groupCache[i] = grp;
      i++;
    }
  }
  nodes = (function() {
    var results;
    results = [];
    for (name in cache) {
      idx = cache[name];
      results.push({
        id: "" + idx,
        group: "" + groupCache[idx], 
        name: "" + name,
        idx: idx
      });
    }
    return results;
  })();
  o = [];
  for (idx = k = 0, len1 = rows.length; k < len1; idx = ++k) {
    row = rows[idx];
    value = parseFloat(row.mentionCount);
    if (isNaN(value)) {
      value = 0.0;
    }
    o.push(_.extend({
      source: cache[row.username],
      target: cache[row.usermentions],
      value: value
    }, row));
  }
  return {
    nodes: nodes,
    links: o
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

  // we are going to add draggable capabililty to the div
  //$( function() {
  //  window.parent.$('#tabZoneId127').draggable();
  //} );


  //add event listener to tabviewer div to get mouse positions
  //window.parent.document.getElementById('tabViewer').addEventListener("click", getClickPosition, false);  

  onDataLoadError = function(err) {
    return console.error("Error during Tableau Async request:", err._error.message, err._error.stack);
  };
  onDataLoadOk = errorWrapped("Getting data from Tableau", function(table) {
    var col_indexes, data, row, tableauData;
    //we have hardcoded column indexes here, but there is probably a better way
    col_indexes = getColumnIndexes(table, ["conference_id", "topic","Path", "PathOrder", "tweeter", "Axis", "username", "Axis A", "usermentions", "Axis B", "mentionCount", "mentionCountFrom", "mentionCountTo"]);
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
    
    tableauData = convertToNodeLink(data); 
    $('#htext').val(JSON.stringify(tableauData)); // trying to save this to a hidden object for later use
    drawd3Force(tableauData); // set up base graph with all data
    keepNodesOnTop(); //push nodes on top 

    //need to display the modal window again on change
    displayModal();

  });

  //this is not getting triggered anymore, moved it outside below
  function updateEditor(urlArray) {

    //filter the two tooltips on the same mark(s) as well
    sheet1= tviz.getWorkbook().getActiveSheet();
    sheet2= tviz2.getWorkbook().getActiveSheet();

    if(sheet1.getSheetType() === 'worksheet') {
      sheet1.applyFilterAsync("urlFilter",urlArray,"REPLACE"); 
      sheet1.applyFilterAsync("tweeter","tableau","REPLACE"); 
    }
    else
    {
      worksheetArray = sheet1.getWorksheets();
      for(var i =0; i < worksheetArray.length; i++) {
          worksheetArray[i].applyFilterAsync("urlFilter",urlArray,"REPLACE"); 
          worksheetArray[i].applyFilterAsync("tweeter","tableau","REPLACE"); 
      }
    }

    if(sheet2.getSheetType() === 'worksheet') {
      sheet2.applyFilterAsync("urlFilter",urlArray,"REPLACE"); 
      sheet2.applyFilterAsync("tweeter","","ALL"); 
    }
    else
    {
      worksheetArray = sheet2.getWorksheets();
      for(var i =0; i < worksheetArray.length; i++) {
          worksheetArray[i].applyFilterAsync("urlFilter",urlArray,"REPLACE"); 
          worksheetArray[i].applyFilterAsync("tweeter","","ALL"); 
      }
    }


    //console.log("Testing whether this triggers for " + urlArray[0]);
    return getCurrentWorksheet().getUnderlyingDataAsync({
      maxRows: 0,
      ignoreSelection: true,
      includeAllColumns: true,
      ignoreAliases: true
    }).then(onDataLoadOk, onDataLoadError);

  };
 
  updateMarkSelect = function(filterArray) {
      var filteredTableauData = {};
      tableauData = $.parseJSON($('#htext').val());
      //console.log(tableauData);

      //for tableau filtering get the element
      sheet= tviz2.getWorkbook().getActiveSheet();

      //first we need to reposition the element and show it // moving this to the part where we picked 
      //displayModal();

      if (filterArray.length == 0) {
        //drawd3Force(tableauData);
        if(sheet.getSheetType() === 'worksheet') {
          //sheet.applyFilterAsync("tweeter","","ALL"); 
          sheet.clearFilterAsync("tweeter");
        }
        else
        {
          worksheetArray = sheet.getWorksheets();
          for(var i =0; i < worksheetArray.length; i++) {
              //worksheetArray[i].applyFilterAsync("tweeter","","ALL"); 
              worksheetArray[i].clearFilterAsync("tweeter");
          }
        }

        errorWrapped("Drawing Embedded d3.js awesomeness", drawd3Force(tableauData));
      }
      else {
        displayModal();

        //now that the d3.js process is done we can update the filter for the matrix viz
        if(sheet.getSheetType() === 'worksheet') {
          sheet.applyFilterAsync("tweeter",filterArray,"REPLACE"); 
        }
        else
        {
          worksheetArray = sheet.getWorksheets();
          for(var i =0; i < worksheetArray.length; i++) {
              worksheetArray[i].applyFilterAsync("tweeter",filterArray,"REPLACE"); 
          }
        }
        //done filtering additional sheet
        consolidatedFilters(tableauData,filterArray);
      }

      keepNodesOnTop(); //push nodes on top 
  };

  function displayModal() {
    //before we show anything we need to move the window to where the mouse is
    window.parent.$('#tabZoneId127').css({"z-index":9999})
    
     //once we have moved the window then we can show it
    $('html').fadeIn(1000);
  };

  function consolidatedFilters(passedArray, passedFilter) { // passedArray needs to contain all underlying data from Tableau, passedFilter contains all the selected marks that the user picked
    var iterations = 1; // 2 will return seed links + their links (e.g., one degree of separation from the selected seed(s))
    var filteredNodeArray = {};
    var filteredLinkArray = {};
    var filteredTableauData = {};

    //need to declare vars up here, cannot redeclare them in the arrays below

    //before we get to iteration we have to start from scratch // this seems to work ok so far
    filteredNodeArray = passedArray.nodes.filter(
      function(nA) { // executed for each person
        for (var i = 0; i < passedFilter.length; i++) { // iterate over filter
          //console.log(nA);
          if (nA.name.indexOf(passedFilter[i]) != -1) {
            //console.log(el.name); // this line is used to double check that we are getting people's handles ok... we are for now
            return true; // if this person knows this language
          }
        }
        return false;
      }
    );     
//    console.log(filteredNodeArray); // this returns our seed node array with individuals names that were passed to the function

    //  for each iteration we...
    //   1. first use the seed node array to get all corresponding links
    //   2. second use the link array to reset the seed array to the new nodes associated with all corresponding links
    for (var j = 0; j < iterations; j++) { // iterate as many times as needed, defaulted to 2 (if you do enough it returns the whole graph)

      filteredLinkArray = passedArray.links.filter(
        function(lA) { // executed for each node in the node array
          for (var i = 0; i < filteredNodeArray.length; i++) { // iterate over filter
//            if (lA.source.indexOf(filteredNodeArray[i].id) != -1 || lA.target.indexOf(filteredNodeArray[i].id) != -1) { 
            //if (lA.source.toString() == filteredNodeArray[i].id || lA.target.toString() == filteredNodeArray[i].id ) { 
              if (lA.username == filteredNodeArray[i].name || lA.usermentions == filteredNodeArray[i].name ) { 
                  return true; // if this person is in the group of nodes
            }
          }
          return false;
        }
      );     
//      console.log(filteredLinkArray); // we can now check the filtered link array to see if we have what we need 
      
      //next we use that array to get our final node array (updated seed array going foward)
      filteredNodeArray = passedArray.nodes.filter(
        function(fNa) { // executed for each person
          for (var i = 0; i < filteredLinkArray.length; i++) { // iterate over filter
            if (fNa.name.indexOf(filteredLinkArray[i].username) != -1 || fNa.name.indexOf(filteredLinkArray[i].usermentions) != -1) {
              return true; // if this person knows this language
            }
          }
          return false;
        }
      );     
      //console.log(filteredNodeArray); //write the updated node array seed to the console to see if it worked

      // now that we have the final array we need to replace the index references which are different after the array filtering
      for (var i = 0; i < filteredNodeArray.length; i++) {
        for (var k = 0; k < filteredLinkArray.length; k++) {
          if (filteredNodeArray[i].name == filteredLinkArray[k].username) {
            filteredLinkArray[k].source = i;
          };
          if (filteredNodeArray[i].name == filteredLinkArray[k].usermentions) {
            filteredLinkArray[k].target = i;
          };
        };
      };

    }

      //now that we are done building the arrays we can just return them in the expected format
      filteredTableauData = {
        nodes: filteredNodeArray, 
        links: filteredLinkArray
      };

      //drawd3Force(filteredTableauData);
      errorWrapped("Drawing Embedded d3.js awesomeness", drawd3Force(filteredTableauData));
    }

  function onMarksSelect(marksEvent) {
    //check on what we are receiving in this function
    console.log("we are in the mark selection", marksEvent.getWorksheet().getName());
    if (marksEvent.getWorksheet().getName() == 'topic hive') {
      return marksEvent.getMarksAsync().then(GetSelectedMarks,GetSelectedMarksError);
    }
    else if (marksEvent.getWorksheet().getName() == 'topic top 50 tweeters') {
      return marksEvent.getMarksAsync().then(GetSelectedMarks,GetSelectedMarksError);
    }
    else if (marksEvent.getWorksheet().getName() == 'topic names') {
      //console.log('did we make it here');
      return marksEvent.getMarksAsync().then(GetSelectedMarksURL,GetSelectedMarksError);
    }
  }

  function GetSelectedMarksURL(marks) {
      var urlArray = [];
      for (var markIndex = 0; markIndex < marks.length; markIndex++) {
          var pairs = marks[markIndex].getPairs();
          for (var pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
              var pair = pairs[pairIndex];
              if (pair.fieldName === "urlFilter") {
                  //for each target that was selected we are going to add it to the global array
                  //only add to array if unique
                  if (urlArray.indexOf(pair.value) === -1) {
                    urlArray.push(pair.value);
                  }
                  //at this point we have finished the loops and we can now call the update function
                  // we only want to do this on the last loop through the marks that have been selected
                  if (markIndex == marks.length -1) {
                    //console.log("we are inside the url selected marks trigger");
                    updateEditor(urlArray);
                    //filterParentViz(urlArray); // this causes the context filter issue with the view
                  }
              }
          }
      }
  }

  function filterParentViz(urlArray) {
    //filter the two tooltips on the same mark(s) as well
    sheet = getCurrentWorksheet();

    //need to display the modal window again on change
    if(sheet.getSheetType() === 'worksheet') {
      sheet.applyFilterAsync("urlFilter",urlArray,"REPLACE"); 
    }
    else
    {
      worksheetArray = sheet.getWorksheets();
      for(var i =0; i < worksheetArray.length; i++) {
          console.log("we are filtering" + worksheetArray[i].getName());
          worksheetArray[i].applyFilterAsync("urlFilter",urlArray,"REPLACE"); 
      }
    }
  }


  function GetSelectedMarks(marks) {
      var filtArray = [];

      //this will cover when the user clicks outside of the marks on the hive and or tweeters
      //this is also causing a problem when the user clicks on the dot plot on the top right
      if (marks.length == 0) {
        updateMarkSelect(filtArray);
      }

      for (var markIndex = 0; markIndex < marks.length; markIndex++) {
          var pairs = marks[markIndex].getPairs();
          for (var pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
              var pair = pairs[pairIndex];
              if (pair.fieldName === "tweeter") {
                  //for each target that was selected we are going to add it to the global array
                  //only add to array if unique
                  if (filtArray.indexOf(pair.value) === -1) {
                    filtArray.push(pair.value);
                  }
                  // at this point we have finished the loops and we can now call the update function
                  // we only want to do this on the last loop through the marks that have been selected
                  if (markIndex == marks.length -1) {
                    //console.log("we are inside the selected marks trigger");
                    updateMarkSelect(filtArray);
                  } 
              }
          }
      }
  }

  GetSelectedMarksError = function(err) {
    return console.error("Error during Tableau marks request:", err.message, err.stack);
  };
  


  //on initial load get data and store it // we will need to recall this when the underlying data changes
  
  getCurrentWorksheet().getUnderlyingDataAsync({
    maxRows: 0,
    ignoreSelection: true,
    includeAllColumns: true,
    ignoreAliases: true
  }).then(onDataLoadOk, onDataLoadError);
  
  
  //append the jquery ui script to the parent
//  $('head', window.parent.document).append('<script type="text/javascript" src="https://code.jquery.com/jquery-1.10.2.js"><\/script>');
//  $('head', window.parent.document).append('<script type="text/javascript" src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"><\/script>');
    //$('#tabZoneId127', window.parent.document).draggable(); // this doesn't work

// trying to dynamically add an overlay on top of the iframe, not working
//    $('head', window.parent.document).append('<style> .frameOverlay { height: 100%; width: 100%; background: rgba(34, 34, 34, 0.5); position: absolute; top: 0; left: 0; display: none; } <\/style>');
//    $('body', window.parent.document).append('<div class="frameOverlay"><\/div>');
//    $('body', window.parent.document).append('<script type="text/javascript">  $(function() { $( "#tabZoneId127" ).draggable({ start: function() { $(".frameOverlay").fadeIn("fast"); }, stop: function() { $(".frameOverlay").fadeOut("fast"); } }); }); <\/script>');

  //add event listener to the viz
  return getCurrentViz().addEventListener(tableau.TableauEventName.MARKS_SELECTION, onMarksSelect);
};


this.appApi = {
  initEditor: initEditor
};