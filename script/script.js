// inspired by 
// https://bost.ocks.org/mike/sankey/ 
// http://bl.ocks.org/git-ashish/8959771

/*  global d3 
    global $
*/

"use strict";
var units = "GWh";

var year=2014;

var margin = {top: 5, right: 0, bottom: 5, left: 10},
    width = 724 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var formatNumber = d3.format(".1f"),    // zero decimal places
    format = function(d) { return formatNumber(d) + " " + units; },
    color = d3.scale.category20();

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");
          
var svgLinkGroup = svg.append("g").attr('id', 'links');
var svgNodeGroup = svg.append("g").attr('id', 'nodes');

// Set the sankey diagram properties
var sankey = d3.sankey()
    .nodeWidth(36)
    .nodePadding(10)
    .size([width, height]);


function replaceSpecialChars(str){
  return str.trim().replace(/[/ ]/g,'-');
}


// load the data
var render = function(year){
  var jsonPath='data/energy' + year + '.json';
  d3.json(jsonPath, function(error, graph) {

      var nodeMap = {};
      graph.nodes.forEach(function(x) { 
        nodeMap[x.name] = x;
        nodeMap[x.name].type = 'node';
        nodeMap[x.name].id = replaceSpecialChars(x.name);
      });
      graph.links = graph.links.map(function(x) {
        return {
          id: replaceSpecialChars(nodeMap[x.source].name.trim() + "-" + nodeMap[x.target].name.trim()),
          type: 'link',
          source: nodeMap[x.source],
          target: nodeMap[x.target],
          value: x.value,
          color: x.color 
        };
      });

    sankey
        .nodes(graph.nodes)
        .links(graph.links)
        .layout(32);
    
    var t = d3.transition().duration(2000);
    
    // JOIN
    var link = svgLinkGroup.selectAll(".link")
      //.data(graph.links);
      .data(graph.links, function(d){return d.id});
      

    // ENTER    
    // add in the links 
    link
      .enter()
        .append("path")
          .attr("class", "link")
          .attr("d", sankey.link())
          //.attr("id", function(d){return "link-" + d.id;}) 
          .style("stroke", function(d){return d.color;}) 
          .style("stroke-width", function(d) { return Math.max(1, d.dy); })
          .sort(function(a, b) { return b.dy - a.dy; })
          .on("mouseover", mouseover)
          .on("mousemove", function(d){mousemove(d)})
          .on("mouseout", mouseout)
      ;
    
    
    // UPDATE
    link
      .transition()
      .attr("d", sankey.link())
      .style("stroke-width", function(d) { return Math.max(1, d.dy); })
    ;
    
    // EXIT
    link
      .exit()
        .remove()
    ;
    
    

    // JOIN
    var node = svgNodeGroup.selectAll(".node")
      .data(graph.nodes, function(d){return d.id;});


    // ENTER
    var nodesEnter = 
    node
      .enter()
        .append("g")
    ;
        
        
    nodesEnter
        .attr("class", "node")
        .attr("transform", function(d) { 
          return "translate(" + d.x + "," + d.y + ")"; })
        .on("click", highlight_node_links) // enables the click-event for highlighting
        ;

    // add the rectangles for the nodes
    nodesEnter
      .append("rect")
      .attr("height", function(d) { return d.dy; })
      .attr("width", sankey.nodeWidth())
      .style("fill", function(d) { return d.color;}) 
      .on("mouseover", mouseover)
      .on("mousemove", function(d){mousemove(d)})
      .on("mouseout", mouseout)
      ;

    // add in the title for the nodes
    nodesEnter
      .append("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start")
    ;


    // UPDATE
    var nodesUpdate = node;
        
    nodesUpdate
      //.transition().duration(2000)
      .attr("transform", function(d) { 
        return "translate(" + d.x + "," + d.y + ")"; })
    ;

    
    // update the rectangles for the nodes
    nodesUpdate
      .transition()
      .select("rect")
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) { return d.color;}) 
    ;

    // add in the title for the nodes
    nodesUpdate
      .transition()
      .select("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        //.attr("transform", null)
        .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start")
    ;

    
    


    // EXIT
    node
      .exit()
        .remove()
    ;


    // Highlight
    function highlight_node_links(node,i){
      var remainingNodes=[],
          nextNodes=[];

      var stroke_opacity = 0;
      if( d3.select(this).attr("data-clicked") == "1" ){
        d3.select(this).attr("data-clicked","0");
        stroke_opacity = null;
      } else{
        d3.select(this).attr("data-clicked","1");
        stroke_opacity = 0.9;
      }

      var traverse = [{
                        linkType : "sourceLinks",
                        nodeType : "target"
                      },{
                        linkType : "targetLinks",
                        nodeType : "source"
                      }];

      traverse.forEach(function(step){
        node[step.linkType].forEach(function(link) {
          remainingNodes.push(link[step.nodeType]);
          highlight_link(link.id, stroke_opacity);
        });

        while (remainingNodes.length) {
          nextNodes = [];
          remainingNodes.forEach(function(node) {
            node[step.linkType].forEach(function(link) {
              nextNodes.push(link[step.nodeType]);
              highlight_link(link.id, stroke_opacity);
            });
          });
          remainingNodes = nextNodes;
        }
      });
    }


    function highlight_link(id,opacity){
        d3.select("#link-"+id).style("stroke-opacity", opacity);
    }
    
    
    // tooltips
    var div = d3.select("body").append("div")
  			.attr("class", "tooltip")
  			.style("display", "none")
  			;
  			
    function mouseover() {
  		div.style("display", "inline");
  	}
  	
  	function mousemove(d) {
  	  var html='';
  	  if (d.type === 'node'){
  	    html = "<strong>" + d.name + ": " + format(d.value) + "</strong>";
  	  }
  	  else {
  	    html = "<strong>" + d.source.name + " \u2192 " + d.target.name + ": " + format(d.value) + "</strong>";
  	  }
  		div
  				.html(html)
  				.style("left", (d3.event.pageX - 50) + "px")
  				.style("top", (d3.event.pageY - 11) + "px");
  	}
  	
  	function mouseout() {
  		div.style("display", "none");
  	}

  });
};

var changeTitle = function(year){
  var title=$("h2").text();
  var newTitle = title.substr(0, title.length - 4) + year;
  $("h2").html(newTitle);
};


$('input:radio[name="year"]').change(function (event) {
    year=event.target.value;
    //changeTitle(year);
    render(year);
});


$(document).ready(function(){
  //changeTitle(year);
  render(year);
})