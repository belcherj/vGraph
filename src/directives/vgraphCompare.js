angular.module( 'vgraph' ).directive( 'vgraphCompare',
    [ '$compile', 'ComponentGenerator',
    function( $compile, ComponentGenerator ) {
        'use strict';

        return {
            require : ['^vgraphChart'],
            scope : {
                config : '=config'
            },
            link : function( scope, $el, attrs, requirements ){
                var graph = requirements[0].graph,
                    el = $el[0],
                    fill;

                function parseConf( config ){
                    var chart1Ready = false,
                        chart2Ready = false,
                        keys = Object.keys(config),
                        name1 = keys[0],
                        chart1 = graph.views[config[name1]],
                        name2 = keys[1],
                        chart2 = graph.views[config[name2]];

                    function draw(){
                        fill.$d3.attr( 'd', fill.calc(graph.unified) );
                        chart1Ready = false;
                        chart2Ready = false;
                    }

                    if ( config && keys.length === 2 ){
                        if( fill ){
                            fill.$d3.remove();
                        }
                        
                        fill = {
                            $d3 : d3.select( el ).append('path').attr( 'class', 'fill' ),
                            calc : ComponentGenerator.makeMyFillCalc( 
                                chart1, 
                                name1,
                                chart2, 
                                name2,
                                function( node, y1, y2 ){
                                    node.$compare = {
                                        middle : ( y1 + y2 ) / 2,
                                        difference : Math.abs( y1 - y2 )
                                    };
                                }
                            )
                        };

                        // this isn't entirely right... It will be forced to call twice
                        chart1.register({
                            finalize : function(){
                                chart1Ready = true;
                                draw();
                            }
                        });

                        chart2.register({
                            finalize : function(){
                                chart2Ready = true;
                                draw();
                            }
                        });
                    }
                }

                scope.$watchCollection('config', parseConf );
            }
        };
    } ]
);
