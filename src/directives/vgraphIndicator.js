angular.module( 'vgraph' ).directive( 'vgraphIndicator',
    [
    function(){
        'use strict';

        return {
            require : ['^vgraphChart'],
            scope : {
                cfg: '=?vgraphIndicator'
            },
            link : function( scope, el, attrs, requirements ){
                var view,
                    pulse,
                    graph = requirements[0],
                    cfg = graph.getReference(scope.cfg),
                    radius = scope.$eval( attrs.pointRadius ) || 3,
                    outer = scope.$eval( attrs.outerRadius ),
                    $el = d3.select( el[0] )
                        .attr( 'transform', 'translate(1000,1000)' )
                        .attr( 'visibility', 'hidden' ),
                    $circle = $el.append( 'circle' )
                        .attr( 'r', radius ),
                    $outer = $el.append( 'circle' )
                        .attr( 'r', radius );

                $circle.attr( 'class', 'point inner '+cfg.className );
                $outer.attr( 'class', 'line outer '+cfg.className );

                if ( outer ){
                    pulse = function() {
                        $outer.transition()
                            .duration( 1000 )
                            .attr( 'r', outer )
                            .transition()
                            .duration( 1000 )
                            .attr( 'r', radius )
                            .ease( 'sine' )
                            .each( 'end', function(){
                                setTimeout(function(){
                                    pulse();
                                }, 3000);
                            });
                    };

                    pulse();
                }

                function clearComponent(){
                    $el.attr( 'visibility', 'hidden' );
                }

                scope.$on('$destroy',
                    graph.$subscribe({
                        'error': clearComponent,
                        'loading': clearComponent
                    })
                );

                view = graph.getView(cfg.view);
                view.registerComponent({
                    finalize : function(){
                        var x, y,
                            d = view.getLeading(),
                            v = cfg.getValue(d);

                        if ( v && view.isLeading() ){
                            x = d._$interval;
                            y = view.y.scale( v );

                            if ( x && y ){
                                $el.attr( 'transform', 'translate(' + x + ',' + y + ')' );
                            
                                $el.attr( 'visibility', 'visible' );
                            }
                        }else{
                            clearComponent();
                        }
                    }
                });
            }
        };
    } ]
);
