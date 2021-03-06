angular.module( 'vgraph' ).factory( 'DataManager',
    [ 'DataCollection',
    function ( DataCollection ) {
        'use strict';

        var uid = 1;

    	function DataManager(){
            this.$$managerUid = uid++;

            this.$dataProc = regulator( 20, 200, function( lm ){
                var registrations = lm.registrations;

                registrations.forEach(function( registration ){
                    registration();
                });
            });

            this.construct();
            this.reset();
        }

        DataManager.prototype.construct = function(){
            var loaders = [];

            this.registrations = [];
            this.errorRegistrations = [];

            this.getLoaders = function(){
                return loaders;
            };

            this.$follow = function( loader ){
                loaders.push( loader );
            };

            this.$ignore = function( loader ){
                var dex = loaders.indexOf( loader );

                if ( dex !== -1 ){
                    loaders.splice( dex, 1 );
                }
            };
        };

        DataManager.prototype.reset = function(){
            this.data = new DataCollection();
            this.ready = false;

            this.dataReady(true);
        };
        // expect a seed function to be defined

         DataManager.prototype.$fillPoints = function( ctrls ){
            var i, c,
                prototype = ctrls.prototype;

            this.filling = ctrls;

            if ( !prototype ){
                prototype = {};
            }

            for( i = ctrls.start, c = ctrls.stop + ctrls.interval; i < c; i += ctrls.interval ){
                this.data._register( i, Object.create(prototype) );
            }
        };

        DataManager.prototype.setValue = function( interval, name, value ){
            if ( this.filling && 
                ( interval < this.filling.min || interval > this.filling.max || 
                    (interval - this.filling.min) % this.filling.interval !== 0 ) ){
                return;  
            }

            this.dataReady();
            
            if ( !this.ready && (value||value === 0) ){
                this.ready = true;
            }
            
            return this.data.$setValue( interval, name, value );
        };

        DataManager.prototype.dataReady = function( force ){
            var registrations = this.registrations;

            if ( force ){
                registrations.forEach(function( registration ){
                    registration();
                });
            }else{
                this.$dataProc( this );
            }
        };

        DataManager.prototype.onError = function( cb ){
            this.errorRegistrations.push( cb );
        };

        DataManager.prototype.setError = function( error ){
            var i, c;

            for( i = 0, c = this.errorRegistrations.length; i < c; i++ ){
                this.errorRegistrations[i]( error );
            }
        };

        DataManager.prototype.getNode = function( interval ){
            this.dataReady();

            return this.data.$getNode( interval );
        };

        DataManager.prototype.removePlot = function(){
           // TODO : redo
        };

        function regulator( min, max, func, context ){
            var args,
                nextTime,
                limitTime;

            function callback(){
                var now = +(new Date());

                if ( now > limitTime || nextTime < now ){
                    limitTime = null;
                    func.apply(context, args);
                }else{
                    setTimeout(callback, min);
                }
            }

            return function(){
                var now = +(new Date());
                
                nextTime = now + min;
                args = arguments;

                if ( !limitTime ){
                    limitTime = now+max;
                    setTimeout(callback, min);
                }
            };
        }

        DataManager.prototype.register = function( cb ){
            this.registrations.push( cb );
        };

        DataManager.prototype.clean = function(){
            this.data.$sort();
        };

        // allows me to generate fake points between real points, used by view
        DataManager.prototype.$makePoint = function( pos ){
            var r, l,
                d,
                dx,
                p = this.data.$pos( pos, '_$index' );

            if ( p.right === p.left ){
                return this.data[p.right];
            }else{
                r = this.data[p.right];
                l = this.data[p.left];
                d = {};
                dx = (pos - l._$index) / (r._$index - l._$index);

                Object.keys(r).forEach(function( key ){
                    var v1 = l[key], 
                        v2 = r[key];

                    // both must be numeric
                    if ( v1 !== undefined && v1 !== null && 
                        v2 !== undefined && v2 !== null ){
                        d[key] = v1 + (v2 - v1) * dx;
                    }
                });

                d.$faux = true;
                d._$index = pos;

                return d;
            }
        };

        return DataManager;
    } ]
);
