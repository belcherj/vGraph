angular.module( 'vgraph' ).directive( 'vgraphLeading',
    [
    function(){
        'use strict';

        return {
            require : ['^vgraphChart'],
            scope : {
                config : '=vgraphLeading'
            },
            link : function( scope, el, attrs, requirements ){
                var graph = requirements[0].graph,
                    $el = d3.select( el[0] ),
                    names;

                function parseConf( config ){
                    var cfg,
                        i, c;
                    
                    names = {};

                    $el.selectAll( 'line' ).remove();

                    if ( config ){
                        for( i = 0, c = config.length; i < c; i++ ){
                            cfg = config[ i ];

                            names[ cfg.name ] = $el.append('line').attr( 'class', 'line '+cfg.className );
                        }
                    }
                }

                function clearComponent(){
                    $el.attr( 'visibility', 'hidden' );
                }

                function drawComponent(){
                    var last,
                        isValid = true,
                        xMax,
                        points = [];

                    angular.forEach( scope.config, function( cfg ){
                        var model = graph.views[cfg.view].models[cfg.model],
                            datum = model[model.length-1],
                            value = datum[ cfg.field ];

                        if ( datum._$index < model.$parent.$maxIndex ){
                            isValid = false;
                        }else{ 
                            if ( xMax === undefined || datum.$_interval > xMax ){
                                xMax = datum._$interval;
                            }

                            datum = model._$index[model.$stats[cfg.field]];
                            value = datum[ cfg.field ];

                            points.push({
                                el : names[cfg.name],
                                y : graph.views[cfg.view].y.scale( value )
                            });
                        }
                    });

                    // sort the points form top to bottom
                    points.sort(function( a, b ){
                        return a.y - b.y;
                    });

                    angular.forEach( points, function( p ){
                        if ( last ){
                            last.el
                                .attr( 'x1', xMax )
                                .attr( 'x2', xMax )
                                .attr( 'y1', last.y )
                                .attr( 'y2', p.y );
                        }

                        last = p;
                    });

                    if ( last && isValid ){
                        $el.attr( 'visibility', 'visible' );

                        last.el
                            .attr( 'x1', xMax )
                            .attr( 'x2', xMax )
                            .attr( 'y1', last.y )
                            .attr( 'y2', graph.box.innerBottom );
                    }else{
                        clearComponent();
                    }
                }

                scope.$watchCollection('config', parseConf );

                scope.$on('$destroy',
                    graph.$subscribe({
                        'error': clearComponent,
                        'loading': clearComponent,
                        'success': drawComponent
                    })
                );
            }
        };
    } ]
);
