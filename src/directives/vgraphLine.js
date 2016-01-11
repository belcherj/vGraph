angular.module( 'vgraph' ).directive( 'vgraphLine',
    ['ComponentGenerator', 'StatCalculations',
    function( ComponentGenerator, StatCalculations ){
        'use strict';

        return {
            scope: {
                config: '=vgraphLine',
                pair: '=?pair'
            },
            require : ['^vgraphChart'],
            link : function( scope, el, attrs, requirements ){
                var pair,
                    $path,
                    drawer,
                    className,
                    references,
                    cfg = ComponentGenerator.normalizeConfig( scope.config ),
                    graph = requirements[0];

                if ( el[0].tagName === 'path' ){
                    $path = d3.select( el[0] );
                }else{
                    $path = d3.select( el[0] ).append('path');
                }

                if ( attrs.pair ){ // pair is already a reference
                    pair = ComponentGenerator.normalizeConfig( scope.pair );
                    className = 'fill ';
                    drawer = ComponentGenerator.makeFillCalc( graph, cfg, pair );
                    references = [cfg,pair];
                }else{
                    className = 'line ';
                    drawer = ComponentGenerator.makeLineCalc( graph, cfg );
                    references = [cfg];
                }

                if ( cfg.classExtend ){
                    className += cfg.classExtend + ' ';
                }

                className += attrs.className || cfg.className;

                $path.attr( 'class', className );

                graph.getView(cfg.view).register({
                    parse: function( models ){
                        return StatCalculations.limits( references, models[cfg.model] );
                    },
                    finalize: function( models ){
                        $path.attr( 'd', drawer(models[cfg.model]) );
                    },
                    publish: function( data, headers, content, calcPos ){
                        headers.push( name );
                        ComponentGenerator.publish( data, name, content, calcPos );
                    }
                });
            }
        };
    }]
);
