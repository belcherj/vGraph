angular.module( 'vgraph', [] );
angular.module( 'vgraph' ).factory( 'DomHelper',
    [
    function () {
        'use strict';

        var regex = {};

        function getReg( className ){
            var reg = regex[className];

            if ( !reg ){
                reg = new RegExp('(?:^|\\s)'+className+'(?!\\S)');
                regex[className] = reg;
            }

            return reg;
        }
        
        return {
            addClass: function( elements, className ){
                var i, c,
                    el,
                    baseClass,
                    reg = getReg( className );


                for( i = 0, c = elements.length; i < c; i++ ){
                    el = elements[i].$element;
                    baseClass = el.getAttribute('class') || '';

                    if ( !baseClass.match(reg) ){
                        el.setAttribute( 'class', baseClass+' '+className );
                    }
                }
            },
            removeClass: function( elements, className ){
                var i, c,
                    el,
                    reg = getReg( className );

                for( i = 0, c = elements.length; i < c; i++ ){
                    el = elements[i].$element;
                    el.setAttribute(
                        'class',
                        (el.getAttribute('class')||'').replace( reg, '' )
                    );
                }
            }
        };
    }]
);
angular.module( 'vgraph' ).factory( 'makeEventing',
    [
    function () {
        'use strict';

        return function( obj ){
            obj.$on = function( event, cb ){
                var dis = this;

                if ( !this._$listeners ){
                    this._$listeners = {};
                }

                if ( !this._$listeners[event] ){
                    this._$listeners[event] = [];
                }

                this._$listeners[event].push( cb );

                return function clear$on(){
                    dis._$listeners[event].splice(
                        dis._$listeners[event].indexOf( cb ),
                        1
                    );
                };
            };

            obj.$subscribe = function( subscriptions ){
                var dis = this,
                    kills = [],
                    events =  Object.keys(subscriptions);


                events.forEach(function( event ){
                    var action = subscriptions[event];

                    kills.push( dis.$on(event,action) );
                });

                return function killAll(){
                    kills.forEach(function( kill ){
                        kill();
                    });
                };
            };

            obj.$trigger = function( event, arg ){
                var listeners,
                    i, c;

                if ( this._$listeners ){
                    listeners = this._$listeners[event];

                    if ( listeners ){
                        for( i = 0, c = listeners.length; i < c; i++ ){
                            listeners[i]( arg );
                        }
                    }                   
                }
            };
        };
    }]
);

angular.module( 'vgraph' ).factory( 'Hitbox',
    [
    function () {
        'use strict';

        var uid = 0;

        function Hitbox( xMin, xMax, yMin, yMax, count ){
        	var i, c,
        		j, co,
        		base = [],
        		xDex = [],
        		yDex = [],
        		child;

        	this.xMin = xMin;
        	this.xDiff = xMax - xMin;
        	this.yMin = yMin;
        	this.yDiff = yMax - yMin;
        	this.count = count;

        	for( i = 0, c = count; i < c; i++ ){
        		child = [];
        		base.push( child );
        		xDex.push( [] );
        		yDex.push( [] );

        		for( j = 0, co = count; j < co; j++ ){
        			child.push( [] );
        		}
        	}

        	this._index = base;
        	this._xDex = xDex;
        	this._yDex = yDex;
        }

      	Hitbox.prototype.$hashX = function( x ){
      		return ( ((x - this.xMin) / this.xDiff) * this.count ) | 0;
      	};

      	Hitbox.prototype.$hashY = function( y ){
      		return ( ((y - this.yMin) / this.yDiff) * this.count ) | 0;
      	};

        Hitbox.prototype.add = function( info ){
        	var i, c,
        		j, co,
        		t,
        		child,
        		base = this._index;

        	if ( info.x1 > info.x2 ){
        		t = info.x1;
        		info.x1 = info.x2;
        		info.x2 = t;
        	}

        	if ( info.y1 > info.y2 ){
        		t = info.y1;
        		info.y1 = info.y2;
        		info.y2 = t;
        	}

        	info.$uid = uid++;

        	i = this.$hashX( info.x1 );
        	c = this.$hashX( info.x2 ) + 1;
        	t = this.$hashY( info.y1 );
        	co = this.$hashY( info.y2 ) + 1;
        	
            for( j = t; j < co; j++ ){
        		this._yDex[j].push( info );
        	}

        	for( ; i < c; i++ ){
        		child = base[i];
        		this._xDex[i].push( info );

        		for( j = t; j < co; j++ ){
        			child[j].push( info );
        		}
        	}
        };

        
        var tests = {
            intersect: function( x, y ){
                return ( this.x1 <= x && this.x2 >= x && this.y1 <= y && this.y2 >= y );
            },
            intersectX: function( x ){
                return ( this.x1 <= x && this.x2 >= x );
            },
            intersectY: function( junk, y ){
                return ( this.y1 <= y && this.y2 >= y );
            }
        };

        function search( matches, x, y, getCheck ){
        	var i, c,
                info,
                hits = [];

            for( i = 0, c = matches.length; i < c; i++ ){
                info = matches[i];

                if ( getCheck(info)(x,y) ){
                    hits.push( info );
                }
        	}

        	return hits;
        }

        Hitbox.prototype.checkHit = function( x, y ){
        	return search( this._index[this.$hashX(x)][this.$hashY(y)], x, y, 
                function( info ){
                    return ( info.intersect?info.intersect:tests.intersect ).bind(info);
                } 
            );
        };

        Hitbox.prototype.checkX = function( x ){
        	return search( this._xDex[this.$hashX(x)], x, null, 
                function( info ){
                    return ( info.intersectX?info.intersectX:tests.intersectX ).bind(info);
                } 
            );
        };

        Hitbox.prototype.checkY = function( y ){
        	return search( this._yDex[this.$hashY(y)], null, y,
                function( info ){
                    return ( info.intersectY?info.intersectY:tests.intersectY ).bind(info);
                } 
            );
        };

        return Hitbox;
    }]
);
angular.module( 'vgraph' ).factory( 'Scheduler',
    [
    function () {
        'use strict';
        
        function Scheduler(){
            this.$scripts = {};
            this.$master = this.schedule = [];
        }

        function __now(){
            return +(new Date());
        }

        Scheduler.prototype.startScript = function( name ){
            if ( name ){
                if( this.$scripts[name] ){
                    this.schedule = this.$scripts[name];
                    this.schedule.length = 0; // wipe out anything that was previously scripted
                }else{
                    this.schedule = this.$scripts[name] = [];
                }
            }else{
                this.schedule = [];
            }
        };

        Scheduler.prototype.endScript = function( always, success, failure ){
            this.schedule.push({
                $end: true,
                always: always,
                success: success,
                failure: failure
            });
            this.$master.push( this.schedule );

            this.schedule = this.$master;
        };

        Scheduler.prototype.loop = function( arr, func, ctx ){
            this.schedule.push({
                start: 0,
                stop: arr.length,
                data: arr,
                op: func,
                ctx: ctx
            });
        };

        Scheduler.prototype.func = function( func, ctx ){
            this.schedule.push({
                op: func,
                ctx: ctx
            });
        };

        // TODO : this should all be managed with promises, but... not adding now
        Scheduler.prototype.run = function(){
            var dis = this;

            if ( !this.$lock ){
                this.$lock = true;
                setTimeout(function(){ // this will gaurentee before you run, the thread was released
                    dis.$eval();
                },5);
            }
        };

        Scheduler.prototype.$eval = function(){
            var dis = this,
                valid = true,
                now = __now(),
                goodTill = now + 500,
                i, c,
                t;

            function rerun(){
                dis.$eval();
            }

            try{
                while( (t = this.schedule.shift()) && valid ){
                    if ( t.length ){ // is an array, aka a script
                        while( t.length ){
                            this.schedule.unshift( t.pop() );
                        }
                    }else if ( 'start' in t ){
                        for( i = t.start, c = t.stop; i < c; i++ ){
                            t.op.call( t.ctx, t.data[i], i );
                        }
                    }else if ( t.$end ){
                        if ( t.success ){
                            t.success();
                        }
                        if ( t.always ){
                            t.always();
                        }
                    }else{
                        t.op.call( t.ctx );
                    }

                    if ( __now() > goodTill ){
                        valid = false;
                        setTimeout(rerun, 5);
                    }
                }
            }catch( ex ){
                console.log( ex );

                valid = true;
                while( (t = this.schedule.shift()) && valid ){
                    if ( t.$end ){
                        if ( t.failure ){
                            t.failure();
                        }
                        if ( t.always ){
                            t.always();
                        }
                        
                        rerun();
                    }
                }
            }

            if ( !this.schedule.length ){
                this.$lock = false;
            }
        };

        return Scheduler;
    }]
);
angular.module( 'vgraph' ).factory( 'ComponentBox',
    [ 'makeEventing',
    function ( makeEventing ) {
        'use strict';

        function extend( model, settings ){
            var padding = settings.padding,
                oPadding = model.padding,
                margin = settings.margin,
                oMargin = model.margin;

            // compute the margins
            if ( !oMargin ){
                model.margin = oMargin = {
                    top : 0,
                    right : 0,
                    bottom : 0,
                    left : 0
                };
            }

            if ( margin ){
                oMargin.top = merge( margin.top , oMargin.top );
                oMargin.right = merge( margin.right, oMargin.right );
                oMargin.bottom = merge( margin.bottom, oMargin.bottom );
                oMargin.left = merge( margin.left, oMargin.left );
            }

            // compute the paddings
            if ( !oPadding ){
                model.padding = oPadding = {
                    top : 0,
                    right : 0,
                    bottom : 0,
                    left : 0
                };
            }

            if ( padding ){
                oPadding.top = merge( padding.top, oPadding.top );
                oPadding.right = merge( padding.right, oPadding.right );
                oPadding.bottom = merge( padding.bottom, oPadding.bottom );
                oPadding.left = merge( padding.left, oPadding.left );
            }

            // set up the knowns
            model.outerWidth = merge( settings.outerWidth, model.outerWidth ) || 0;
            model.outerHeight = merge( settings.outerHeight, model.outerHeight ) || 0;

            // where is the box
            model.top = oMargin.top;
            model.bottom = model.outerHeight - oMargin.bottom;
            model.left = oMargin.left;
            model.right = model.outerWidth - oMargin.right;

            model.center = ( model.left + model.right ) / 2;
            model.middle = ( model.top + model.bottom ) / 2;

            model.width = model.right - model.left;
            model.height = model.bottom - model.top;

            // where are the inners
            model.innerTop = model.top + oPadding.top;
            model.innerBottom = model.bottom - oPadding.bottom;
            model.innerLeft = model.left + oPadding.left;
            model.innerRight = model.right - oPadding.right;

            model.innerWidth = model.innerRight - model.innerLeft;
            model.innerHeight = model.innerBottom - model.innerTop;

            model.ratio = model.outerWidth + ' x ' + model.outerHeight;
        }

        function ComponentBox( settings ){
            extend( this, settings || {} );
        }

        makeEventing( ComponentBox.prototype );

        function merge( nVal, oVal ){
            return nVal !== undefined ? parseInt( nVal ) : oVal;
        }

        ComponentBox.prototype.targetSvg = function( el ){
            this.$element = jQuery(el); // I'd like not to need this

            this.resize();
        };

        ComponentBox.prototype.resize = function(){
            var el = this.$element;

            el.attr( 'width', null )
                .attr( 'height', null );

            el[0].style.cssText = null;

            extend( this, {
                outerWidth : el.outerWidth( true ),
                outerHeight : el.outerHeight( true ),
                margin : {
                    top : el.css('margin-top'),
                    right : el.css('margin-right'),
                    bottom : el.css('margin-bottom'),
                    left : el.css('margin-left')
                },
                padding : {
                    top : el.css('padding-top'),
                    right : el.css('padding-right'),
                    bottom : el.css('padding-bottom'),
                    left : el.css('padding-left')
                }
            });

            el.css('margin', '0')
                .css('padding', '0')
                .attr( 'width', this.outerWidth )
                .attr( 'height', this.outerHeight )
                .css({
                    width : this.outerWidth+'px',
                    height : this.outerHeight+'px'
                });

            if ( this.innerWidth && this.innerHeight ){
                this.$trigger('resize');
            }
        };

        return ComponentBox;
    }]
);

/** cfg for inputs
    - name
    - view
    - model
    - getValue
    - getInterval
    - massage
    - isValid
**/

/** cfg for graph
    x: {
        scale : some scaling function
        padding: amount to add padding // TODO
        format: value formatting function
    },
    normalizeX: boolean if make all the x values align between views
    y: {
        scale : some scaling function
        padding: amount to add padding
        format: value formatting function
    },
    normalizeY: boolean if make all the y values align between views,
    fitToPane: boolean if data should fit to pane or cut off
    views: {
        viewName: ViewModel
    }
**/

/** cfg for view 
    manager: the manager to lock the view onto
**/
angular.module( 'vgraph' ).factory( 'ComponentChart',
    [ '$timeout', 
        'ComponentView', 'ComponentPage', 'ComponentBox', 'DataCollection', 
        'makeEventing', 'Scheduler', 'Hitbox', 'DomHelper',
    function ( $timeout, 
        ComponentView, ComponentPage, ComponentBox, DataCollection, 
        makeEventing, Scheduler, Hitbox, domHelper ) {
        'use strict';

        var schedule = new Scheduler(),
            ids = 1;
        
        function ComponentChart(){
            var dis = this;

            this.$vguid = ++ids;
            this.box = new ComponentBox();
            this.views = {};
            this.models = [];
            this.waiting = {};
            this.references = {};
            this.components = [];

            this.pristine = false;
            this.loading = true;
            this.message = null;

            this.$on('focus',function( pos ){
                if ( pos ){
                    dis.highlightOn( pos );
                }else{
                    dis.highlightOff();
                }
            });
        }

        makeEventing( ComponentChart.prototype );

        ComponentChart.defaultView = 'default';

        ComponentChart.prototype.configure = function( page, settings ){
            var views,
                addView = this.addView.bind(this);

            if ( !settings ){
                settings = {};
            }

            if ( !this.settings ){
                this.settings = {};
            }

            this.settings.fitToPane = settings.fitToPane;

            this.page = page;
            this.normalizeY = settings.normalizeY;
            this.normalizeX = settings.normalizeX;

            this.settings.x = ComponentView.parseSettingsX( settings.x, this.settings.x );
            this.settings.y = ComponentView.parseSettingsY( settings.y, this.settings.y );

            // I want to compile everything but scale.
            if ( settings.x ){
                this.settings.x.scale = settings.x.scale;
            }else{
                this.settings.x.scale = null;
            }

            if ( settings.y ){
                this.settings.y.scale = settings.y.scale;
            }else{
                this.settings.y.scale = null;
            }
            
            views = settings.views;
            if ( !views ){
                views = {};
                views[ ComponentChart.defaultView ] = {};
            }else if ( angular.isFunction(views) ){
                views = views();
            }
            
            angular.forEach( views, addView );
        };

        function normalizeY( views ){
            var min, max;

            views.forEach(function( view ){
                var vp = view.viewport;

                if ( min === undefined || min > vp.minValue ){
                    min = vp.minValue;
                }

                if ( max === undefined || max < vp.maxValue ){
                    max = vp.maxValue;
                }
            });

            views.forEach(function( view ){
                view.setViewportValues( min, max );
            });
        }

        function normalizeX( views ){
            var min, max;

            views.forEach(function( view ){
                var vp = view.viewport;

                if ( min === undefined || min > vp.minInterval ){
                    min = vp.minInterval;
                }

                if ( max === undefined || max < vp.maxInterval ){
                    max = vp.maxInterval;
                }
            });

            views.forEach(function( view ){
                view.setViewportIntervals( min, max );
            });
        }

        var cfgUid = 0;

        ComponentChart.prototype.getReference = function( refDef ){
            var ref = this.references[refDef.name];

            if ( !ref ){
                ref = {
                    $uid: cfgUid++,
                    name: refDef.name,
                    className: refDef.className ? refDef.className : 'node-'+refDef.name
                };
                this.references[refDef.name] = ref;
            }

            return ref;
        };

        ComponentChart.prototype.compileReference = function( refDef ){
            var ref;

            if ( typeof(refDef) !== 'object' ){
                return null;
            }

            ref = this.getReference( refDef );

            ref.field = ref.name;

            if ( refDef.getValue === undefined ){
                ref.getValue = function( d ){
                    if ( d ){
                        return d[ ref.field ];
                    }
                };
            }else{
                ref.getValue = refDef.getValue;
            }

            // undefined allow lax definining, and simplicity for one view sake.
            // null will mean no view editing
            if ( refDef.view === undefined ){
                refDef.view = ComponentChart.defaultView;
            }else if ( refDef.view ){
                refDef.view = refDef.view;
            }

            if ( refDef.view ){
                ref.view = refDef.view;
                ref.$view = this.getView( refDef.view );
                ref.$getNode = function( index ){
                    return this.$view.normalizer.$getNode(index);
                };
                ref.$getValue = function( index ){
                    var t = this.$view.normalizer.$getNode(index);

                    if ( t ){
                        return this.getValue(t);
                    }
                };
                ref.$eachNode = function( fn ){
                    this.$view.normalizer.$sort().forEach( fn );
                };
                ref.$getIndexs = function(){
                    return this.$view.normalizer.$getIndexs();
                };
            } else if ( refDef.$getValue ){
                ref.$getValue = refDef.$getValue;
            } else if ( !ref.$getValue ) {
                throw new Error('drawer reference requires view or $getValue');
            }

            if ( refDef.isValid ){
                ref.isValid = refDef.isValid;
            }

            return ref;
        };

        // Fired to render the chart and all of its child elements
        ComponentChart.prototype.render = function(){
            var dis = this,
                currentView, // used for debugging
                activeViews = [],
                isReady = false,
                hasViews = 0;

            try{
                // generate data limits for all views
                angular.forEach( this.views, function( view, name ){
                    currentView = name;
                    view.parse();
                });

                // do any of our views have data?
                angular.forEach( this.views, function( view, name ){
                    currentView = name;
                    if ( view.hasData() ){
                        activeViews.push( view );
                        isReady = true;
                    }else if ( view.isReady() ){
                        isReady = true;
                    }
                });

                // sync up views if required
                if ( this.normalizeY ){
                    normalizeY( activeViews );
                }

                if ( this.normalizeX ){
                    normalizeX( activeViews );
                }
            }catch( ex ){
                console.log( '---parsing error---', 'view:'+currentView );
                console.log( ex );
                console.log( ex.stack );
            }

            hasViews = activeViews.length;
            this.loading = !isReady;

            schedule.startScript( this.$vguid );

            this.configureHitbox();
            
            if ( this.loading ){
                dis.$trigger('loading');

                schedule.func(function(){
                    dis.loading = true;
                    dis.pristine = false;
                });
            }else if ( hasViews ){
                schedule.func(function(){
                    dis.message = null;
                });

                /**
                Step through the build cycle for all views.  Due to DOM parsing rules, it is faster to:
                 
                build : alter DOM
                process : check DOM positioning calculations
                finalize : do final DOM adjustments
                **/
                schedule.loop( this.components, function( component ){
                    if ( component.build ){
                        component.build();
                    }
                });

                schedule.loop( activeViews, function( view ){
                    view.build();
                });

                schedule.loop( this.components, function( component ){
                    if ( component.process ){
                        component.process();
                    }
                });

                schedule.loop( activeViews, function( view ){
                    view.process();
                });

                schedule.loop( this.components, function( component ){
                    if ( component.finalize ){
                        component.finalize();
                    }
                });

                schedule.loop( activeViews, function( view ){
                    view.finalize();
                });

                schedule.func(function(){
                    dis.loading = false;
                    dis.pristine = true;
                });
            }else{
                dis.$trigger('error');

                schedule.func(function(){
                    dis.message = 'No Data Available';
                    dis.pristine = false;
                });
            }

            schedule.endScript(
                function(){
                    // always
                    dis.$trigger('done');
                },
                function(){
                    // if success
                    dis.$trigger('success', activeViews[0]);
                },
                function(){ 
                    // if error
                    dis.pristine = false;
                    dis.message = 'Unable to Render';

                    dis.$trigger('error');
                }
            );
            schedule.run();
        };

        ComponentChart.prototype.scheduleRender = function( cb ){
            var dis = this;

            if ( !this.nrTimeout ){
                this.nrTimeout = $timeout(function(){
                    dis.render( dis.waiting, cb );
                    dis.waiting = {};
                    dis.nrTimeout = null;
                }, 30 );
            }
        };

        ComponentChart.prototype.rerender = function( cb ){
            this.scheduleRender( cb );
            this.waiting = this.views;
        };

        ComponentChart.prototype.needsRender = function( view, cb ){
            this.scheduleRender( cb );
            if ( !this.waiting[view.name] ){
                this.waiting[view.name] = view;
            }
        };

        ComponentChart.prototype.getView = function( viewName ){
            var t = this.views[ viewName ];

            if ( !t ){
                t = new ComponentView();
                this.views[ viewName ] = t;
            }

            return t;
        };

        ComponentChart.prototype.addView = function( viewSettings, viewName ){
            var dis = this,
                settings = this.settings,
                viewModel = this.getView( viewName );

            viewModel.configure(
                viewSettings,
                settings,
                this.box,
                this.page
            );

            viewModel.manager.register(function(){
                dis.needsRender(viewModel);
            });

            viewModel.manager.onError(function( error ){
                dis.error( error );
            });
        };

        ComponentChart.prototype.error = function( error ){
            if ( error ){
                this.loading = false;
                this.message = error;
            }else{
                this.message = null;
            }

            this.$trigger('error');
        };

        ComponentChart.prototype.setPane = function( leftPercent, rightPercent ){
            var views = this.views,
                viewNames = Object.keys(this.views);

            this.settings.x.minPane = leftPercent;
            this.settings.x.maxPane = rightPercent;

            viewNames.forEach(function( viewName ){
                views[viewName].pane.setPane({
                    start: leftPercent,
                    stop: rightPercent
                });
            });
        };

        ComponentChart.prototype.registerComponent = function( component ){
            this.components.push(component);
        };

        ComponentChart.prototype.configureHitbox = function(){
            var box = this.box;

            this.hitbox = new Hitbox(
                box.left,
                box.right,
                box.top,
                box.bottom,
                10
            );
        };

        ComponentChart.prototype.registerElement = function( info, element ){
            info.$element = element;

            this.hitbox.add( info );
        };
        
        ComponentChart.prototype.highlightElements = function( x, y ){
            var vertical = this.hitbox.checkX( x ),
                horizontal = this.hitbox.checkY( y ),
                intersections = this.hitbox.checkHit( x, y );

            this.unlightElements();

            domHelper.addClass( vertical, 'highlight-vertical' );
            domHelper.addClass( horizontal, 'highlight-horizontal' );
            domHelper.addClass( intersections, 'highlight' );

            this._activeElements = {
                vertical: vertical,
                horizontal: horizontal,
                intersections: intersections
            };
        };

        ComponentChart.prototype.unlightElements = function(){
            var highlights = this._activeElements;

            if ( highlights ){
                domHelper.removeClass( highlights.vertical, 'highlight-vertical' );
                domHelper.removeClass( highlights.horizontal, 'highlight-horizontal' );
                domHelper.removeClass( highlights.intersections, 'highlight' );
            }
        };

        ComponentChart.prototype.highlightOn = function( pos ){
            var sum = 0,
                count = 0,
                points = {};

            angular.forEach( this.views, function( view, viewName ){
                var p;

                points[viewName] = view.getPoint( pos.x );

                p = points[viewName]._$interval;

                if ( p !== undefined ){
                    count++;
                    sum += p;
                }
            });

            points.$pos = sum / count;
            points.pos = pos;

            this.$trigger( 'focus-point', points );
            this.$trigger( 'highlight', points );

            this.highlightElements( pos.x, pos.y );
        };

        ComponentChart.prototype.highlightOff = function(){
            this.$trigger('highlight',null);
            this.unlightElements();    
        };

        /*
        function reduce( arr, target ){
            var ar,
                i, c,
                j, co;

            for( i = 0, c = arr.length; i < c; i++ ){
                ar = arr[i];

                for( j = 0, co = ar.length; j < co; j++ ){
                    if ( ar[j] !== null ){
                        target[i].unshift( ar[j] );
                        j = co;
                    }
                }
            }
        }

        function publish( config, views, stats, width, size ){
            var i,
                headers = [],
                content = [];

            for( i = 0; i < size; i++ ){
                content.push([]);
            }
            content.push([]); // size is the limit, so it needs one more

            angular.forEach( config, function( conf ){
                var view = views[conf.view],
                    stat = stats[view.name];

                headers.push( conf.label );
                view.publishData( content, conf, function(p){
                    return Math.round( (p.$x-stat.data.min) / width * size );
                });
            });

            return {
                header: headers,
                body: content
            };
        }

        ComponentChart.prototype.publish = function( config, index ){
            var width,
                size,
                step,
                views = {},
                stats = {},
                content;

            angular.forEach( config, function( conf ){
                var view = this.views[conf.view];
                if ( view && !views[view.name] ){
                    views[view.name] =  view;
                }
            }, this );

            // this assumes each interval is the same units
            angular.forEach( views, function( view ){
                var stat = view.publishStats(),
                    s = stat.data.max-stat.data.min;
                // expect min, max, step

                stats[view.name] = stat;

                if ( !width || s > width ){
                    width = s;
                }

                if ( !step || stat.step < step ){
                    step = stat.step;
                }
            });

            size = Math.ceil( width / step );

            content = publish( config, views, stats, width, size );
            if ( index ){
                index = publish( index, views, stats, width, size );
                reduce( index.body, content.body );
                content.header.unshift( index.header[0] );
            }

            content.body.unshift( content.header );

            return content.body;
        };
        */

        return ComponentChart;
    } ]
);

angular.module( 'vgraph' ).factory( 'ComponentElement',
    [ 'StatCalculations',
    function ( StatCalculations ) {
        'use strict';

        function svgCompile( template ){
            return (new DOMParser().parseFromString(
                '<g xmlns="http://www.w3.org/2000/svg">' +
                    template +
                '</g>','image/svg+xml'
            )).childNodes[0].childNodes;
        }

        function appendChildren( element, dataSets, children ){
        	var i,
                root = element.element;

        	root.innerHTML = '';
        	
            for( i = children.length - 1; i !== -1; i-- ){
                element.register( dataSets[i], children[i] );
                root.appendChild( children[i] );
            }
        }

        function ComponentElement(){
        	this.children = null;
        }

        ComponentElement.svgCompile = svgCompile;
        
        ComponentElement.prototype.setElement = function( domNode ){
        	this.element = domNode;
        };

        ComponentElement.prototype.setDrawer = function( drawerFactory ){
        	this.factory = drawerFactory;
        };

        ComponentElement.prototype.setReferences = function( references ){
        	var refs = [],
                keys = [];

            if ( !angular.isArray(references) ){
        		references = [ references ];
        	}

        	references.forEach(function( ref ){
                if ( !ref ){
                    return;
                }

                refs.push( ref );
                if ( ref.requirements ){
                    keys = keys.concat( ref.requirements );
                }else{
                    keys.push( ref.field );
                }
            });

            // TODO : requirements need to be registered with view's normalizer
            this.references = refs;
            this.keys = keys;
        };

        ComponentElement.prototype.factory = function(){
            throw new Error('Need to extend and define a factory');
        };

        ComponentElement.prototype.parse = function(){
            return StatCalculations.limits( this.references );
        };

        ComponentElement.prototype.build = function(){
        	var drawer = this.factory( this.references ),
                indexs = StatCalculations.indexs( this.references ),
                dataSets = drawer.convert( indexs );

            // dataSets will be the content, preParsed, used to make the data
        	if ( this.element.tagName === 'g' ){
        		appendChildren(
        			this,
                    dataSets,
        			svgCompile(
        				this.make( 
        					dataSets, 
        					drawer.makeElement.bind( drawer ) 
        				).join('')
        			)
        		);
        	}else{
        		this.element.setAttribute(
        			'd',
	        		this.make( 
	        			dataSets, 
	        			drawer.makePath.bind( drawer ) 
	        		).join('')
	        	);
        	}
        };

        ComponentElement.prototype.register = function(){}; // hook for registering data -> elements

        ComponentElement.prototype.make = function( dataSets, maker ){
			var i, c,
				t,
				res = [];

			for( i = 0, c = dataSets.length; i < c; i++ ){
				t = maker( dataSets[i] );
				if ( t ){
					res.push( t );
				}
			}
			
			return res;
		};

        return ComponentElement;
    }]
);
angular.module( 'vgraph' ).factory( 'ComponentGenerator',
    [ 'DrawBuilder', 'DrawLine', 'DrawFill', 'DrawBox', 'DrawIcon',
    function ( DrawBuilder, DrawLine, DrawFill, DrawBox, DrawIcon ) {
        'use strict';

        var isNumeric = DrawBuilder.isNumeric;
        
        return {
            isNumeric: isNumeric,
            makeLineCalc: function( ref ){
                var lineDrawer = new DrawLine();

                lineDrawer.preparse = function( index ){
                    var node = ref.$getNode(index);

                    return {
                        x: node._$interval,
                        y: ref.getValue(node)
                    };
                };

                return function configureDraw(){
                    var view = ref.$view;

                    lineDrawer.scale = function( v ){
                        return view.y.scale( v );
                    };

                    return lineDrawer;
                };
            },
            makeBoxCalc: function( ref, elemental ){
                var view,
                    value,
                    isValid,
                    getValue,
                    boxDrawer = new DrawBox(elemental);

                boxDrawer.preparse = function( index ){
                    var node = ref.$getNode(index);

                    if ( isValid(node) ){
                        if ( getValue ){
                            value = getValue(node);
                            return {
                                x1: node._$interval,
                                x2: node._$interval,
                                y1: value,
                                y2: value
                            };
                        }else{
                            return {
                                x1: node._$interval,
                                x2: node._$interval,
                                y1: view.viewport.minValue,
                                y2: view.viewport.maxValue
                            };
                        }
                    }
                };

                return function configureDraw(){
                    view = ref.$view;
                    isValid = ref.isValid;
                    getValue = ref.getValue;

                    boxDrawer.scale1 = boxDrawer.scale2 = function( v ){
                        return view.y.scale( v );
                    };

                    return boxDrawer;
                };
            },
            makeIconCalc: function( ref, box, content ){
                var view,
                    value,
                    isValid,
                    getValue,
                    iconDrawer = new DrawIcon( box, content );

                iconDrawer.preparse = function( index ){
                    var node = ref.$getNode(index);

                    if ( isValid(node) ){
                        if ( getValue ){
                            value = getValue(node);
                            
                            return {
                                x1: node._$interval,
                                x2: node._$interval,
                                y1: value,
                                y2: value
                            };
                        }else{
                            return {
                                x1: node._$interval,
                                x2: node._$interval,
                                y1: view.viewport.minValue,
                                y2: view.viewport.maxValue
                            };
                        }
                    }
                };

                return function configureDraw(){
                    view = ref.$view;
                    isValid = ref.isValid;
                    getValue = ref.getValue;

                    iconDrawer.scale1 = iconDrawer.scale2 = function( v ){
                        return view.y.scale( v );
                    };

                    return iconDrawer;
                };
            },
            makeBarCalc: function( topRef, bottomRef, barWidth ){
                var topView,
                    bottomView,
                    boxDrawer = new DrawBox(),
                    oldMerge = boxDrawer.mergeSet;

                boxDrawer.preparse = function( index ){
                    var min,
                        max,
                        y1,
                        y2,
                        t,
                        width,
                        topNode = topRef.$getNode(index);

                    y1 = topRef.getValue(topNode);
                    
                    if ( bottomRef ){
                        y2 = bottomRef.$getValue(index);
                    }else{
                        y2 = bottomView.viewport.minValue;
                    }

                    if ( barWidth ){
                        width = parseInt( barWidth, 10 ) / 2;
                    }else{
                        width = 3;
                    }

                    if ( isNumeric(y1) && isNumeric(y2) && y1 !== y2 ){
                        min = topNode._$interval - width;
                        max = topNode._$interval + width;

                        t = {
                            x1: min > topNode._$minInterval ? min : topNode._$minInterval,
                            x2: max > topNode._$maxInterval ? topNode._$maxInterval : max,
                            y1: y1,
                            y2: y2
                        };
                    }

                    return t;
                };

                boxDrawer.mergeSet = function( parsed, set ){
                    oldMerge.call( this, parsed, set );
                    return true;
                };

                return function configureDraw(){
                    topView = topRef.$view;

                    if ( bottomRef ){
                        bottomView = bottomRef.$view;
                    }else{
                        bottomView = topView;
                    }

                    boxDrawer.scale1 = function( v ){
                        return topView.y.scale( v );
                    };

                    boxDrawer.scale2 = function( v ){
                        return bottomView.y.scale( v );
                    };

                    return boxDrawer;
                };
            },
            // top and bottom are config objects
            makeFillCalc: function( topRef, bottomRef ){
                var topView,
                    bottomView,
                    areaDrawer = new DrawFill();

                areaDrawer.preparse = function( index ){
                    var y1,
                        y2,
                        topNode = topRef.$getNode(index);

                    y1 = topRef.getValue(topNode);
                    
                    if ( bottomView ){
                        y2 = bottomRef.$getValue( index );
                    }else{
                        y2 = topView.viewport.minValue;
                    }

                    if ( isNumeric(y1) && isNumeric(y2) ){
                        return {
                            x: topNode._$interval,
                            y1: y1,
                            y2: y2
                        };
                    }
                };

                return function configureDraw(){
                    topView = topRef.$view;

                    areaDrawer.scale1 = function( v ){
                        return topView.y.scale(v);
                    };

                    if ( bottomRef ){
                        bottomView = bottomRef.$view;
                        areaDrawer.scale2 = function( v ){
                            return bottomView.y.scale(v);
                        };
                    }else{
                        areaDrawer.scale2 = areaDrawer.scale1;
                    }

                    return areaDrawer;
                };
            },
        };
    }]
);

angular.module( 'vgraph' ).factory( 'ComponentPage',
    [ 'DataFeed', 'DataLoader', 'DataManager',
    function ( DataFeed, DataLoader, DataManager ) {
        'use strict';
        
        var uid = 1;

        function ComponentPage(){
            this.$$pageUid = uid++;
            
            this.feeds = {};
            this.charts = {};
            this.managers = {};
            this.connections = {};
        }

        ComponentPage.defaultManager = 'default';

        ComponentPage.prototype.configure = function( settings ){
            var i, c,
                key,
                keys;

            if ( angular.isArray(settings) ){
                for( i = 0, c = settings.length; i < c; i++ ){
                    this.addFeed( settings[i] );
                }
            }else{
                keys = Object.keys(settings.managers);
                for( i = 0, c = keys.length; i < c; i++ ){
                    key = keys[i];
                    this.getManager(key).$fillPoints( 
                        settings.managers[key]
                    );
                }

                for( i = 0, c = settings.feeds.length; i < c; i++ ){
                    this.addFeed( settings.feeds[i] );
                }
            }
        };

        ComponentPage.prototype.addFeed = function( cfg ){
            var feed,
                loader,
                manager,
                managerName,
                source = cfg.src || [];

            if ( !cfg.manager ){
                cfg.manager = ComponentPage.defaultManager;
            }
            managerName = cfg.manager;

            if ( source._$feedUid ){
                feed = this.feeds[ source._$feedUid ];
            }else{
                feed = new DataFeed( source, cfg.explode );
                this.feeds[ feed.$$feedUid ] = feed;
                source._$feedUid = feed.$$feedUid;
            }
            
            manager = this.getManager( managerName );

            if ( !this.connections[feed.$$feedUid] ){
                this.connections[feed.$$feedUid] = {};
            }

            loader = this.connections[feed.$$feedUid][manager.$$managerUid];
            if ( !loader ){
                loader = new DataLoader( feed, manager );
                this.connections[feed.$$feedUid][manager.$$managerUid] = loader;
            }

            loader.addConfig(cfg);

            return source;
        };

        ComponentPage.prototype.getManager = function( managerName ){
            var name = managerName || ComponentPage.defaultManager,
                manager = this.managers[name];

            if ( !manager ){
                manager = new DataManager();
                this.managers[name] = manager;
            }
            
            return manager;
        };

        ComponentPage.prototype.setChart = function( chartName, chart ){
            this.charts[chartName] = chart;
        };

        ComponentPage.prototype.getChart = function( chartName ){
            return this.charts[chartName];
        };

        return ComponentPage;
    }]
);
angular.module( 'vgraph' ).factory( 'ComponentPane',
    [
    function () {
        'use strict';

        function ComponentPane( fitToPane, xObj, yObj ){
            this.x = xObj;
            this.y = yObj;
            this.fitToPane = fitToPane || false;
            
            this._pane = {};
            this._bounds = {};
            
            if ( !xObj ){
                xObj = {};
            }

            if ( !yObj ){
                yObj = {};
            }

            this.setBounds( {min:xObj.min,max:xObj.max}, {min:yObj.min,max:yObj.max} );
        }

        ComponentPane.prototype.setBounds = function( x, y ){
            this._bounds.x = x;
            this._bounds.y = y;

            return this;
        };

        ComponentPane.prototype.setPane = function( x, y ){
            this._pane.x = x;
            this._pane.y = y;

            return this;
        };

        ComponentPane.prototype.filter = function( dataManager, offset ){
            var $min,
                $max,
                change,
                filtered,
                minInterval,
                maxInterval,
                x = this.x,
                data = dataManager.data;

            if ( data.length ){
                dataManager.clean();
                
                $min = this._bounds.x.min || data.$minIndex;
                $max = this._bounds.x.max || data.$maxIndex;

                x.$min = $min;
                x.$max = $max;

                if ( this._pane.x && this._pane.x.stop ){
                    change = this._pane.x;
                   
                    minInterval = $min + change.start * ($max - $min);
                    maxInterval = $min + change.stop * ($max - $min);
                }else{
                    minInterval = $min;
                    maxInterval = $max;
                }

                offset.$left = minInterval;
                offset.left = (minInterval - $min) / ($max - $min);
                offset.$right = maxInterval;
                offset.right = (maxInterval - $min) / ($max - $min);

                // calculate the filtered points
                filtered = data.$filter( minInterval, maxInterval );

                if ( this.fitToPane && data.length > 1 ){
                    if ( minInterval > data.$minIndex ){
                        filtered.$addNode( minInterval, dataManager.$makePoint(minInterval), true );
                    }

                    if ( maxInterval < data.$maxIndex ){
                        filtered.$addNode( dataManager.$makePoint(maxInterval) );
                    }
                }

                filtered.$sort();
            }

            return filtered;
        };

        return ComponentPane;
    }]
);
angular.module( 'vgraph' ).factory( 'ComponentView',
    [ 'ComponentPane', 'ComponentPage', 'DataNormalizer',
    function ( ComponentPane, ComponentPage, DataNormalizer ) {
        'use strict';
        
        var id = 1;

        function ComponentView(){
            this.$vgvid = id++;

            this.components = [];
        }

        function parseSettings( settings, old ){
            if ( !old ){
                old = {};
            }

            if ( settings.min !== undefined ){
                old.min = settings.min;
            }

            if ( settings.max !== undefined ){
                old.max = settings.max;
            }

            if ( settings.scale ){
                old.scale = settings.scale();
            }else if ( !old.scale ){
                old.scale = d3.scale.linear();
            }

            if ( settings.format ){
                old.format = settings.format;
            }else if ( !old.scale ){
                old.format = function( v ){ return v; };
            }

            if ( settings.padding ){
                old.padding = settings.padding;
            }

            return old;
        }

        ComponentView.parseSettingsX = function( settings, old ){
            if ( !settings ){
                settings = {};
            }

            old = parseSettings( settings, old );

            if ( settings.minPane !== undefined ){
                old.minPane = settings.minPane;
            }

            if ( settings.maxPane !== undefined ){
                old.maxPane = settings.maxPane;
            }

            if ( settings.interval !== undefined ){
                old.interval = settings.interval;
            }

            return old;
        };

        ComponentView.parseSettingsY = function( settings, old ){
            if ( !settings ){
                settings = {};
            }

            return parseSettings( settings, old );
        };

        ComponentView.prototype.configure = function( settings, chartSettings, box, page ){
            this.x = ComponentView.parseSettingsX( chartSettings.x, this.x );
            ComponentView.parseSettingsX( settings.x, this.x );
            
            this.y = ComponentView.parseSettingsY( chartSettings.y, this.y );
            ComponentView.parseSettingsY( settings.y, this.y );
            
            this.box = box;
            this.manager = page.getManager( settings.manager || ComponentPage.defaultManager );
            this.normalizer = settings.normalizer || 
                new DataNormalizer(
                    function(datum){
                        return Math.round(datum._$interval);
                    }
                );

            this.adjustSettings = chartSettings.adjustSettings;
            this.pane = new ComponentPane( chartSettings.fitToPane, this.x, this.y );

            if ( this.x.max ){
                this.pane.setBounds({
                    min: this.x.min, 
                    max: this.x.max 
                });
            }

            if ( this.x.maxPane ){
                this.pane.setPane({
                    min: this.x.minPane, 
                    max: this.x.maxPane
                });
            }
        };

        ComponentView.prototype.registerComponent = function( component ){
            this.components.push( component );
        };

        ComponentView.prototype.isReady = function(){
            return this.manager && this.manager.ready;
        };

        ComponentView.prototype.hasData = function(){
            return this.isReady() && this.manager.data.length;
        };

        ComponentView.prototype._sample = function(){
            this.offset = {};
            this.filtered = this.pane.filter( this.manager, this.offset );
        };

        // true when the filtered data contains the leading edge of data
        ComponentView.prototype.isLeading = function(){
            return this.viewport && this.viewport.maxInterval > this.filtered.$maxIndex;
        };

        ComponentView.prototype.getLeading = function(){
            return this.filtered[this.filtered.length-1]; 
        };

        ComponentView.prototype.setViewportValues = function( min, max ){
            var step,
                box = this.box;

            if ( this.y.padding ){
                if ( max === min ){
                    step = min * this.y.padding;
                }else{
                    step = ( max - min ) * this.y.padding;
                }

                max = max + step;
                min = min - step;
            }

            this.viewport.minValue = min;
            this.viewport.maxValue = max;

            this.y.scale
                .domain([
                    min,
                    max
                ])
                .range([
                    box.innerBottom,
                    box.innerTop
                ]);
        };

        ComponentView.prototype.setViewportIntervals = function( min, max ){
            var box = this.box,
                scale = this.x.scale;

            this.viewport.minInterval = min;
            this.viewport.maxInterval = max;

            scale
                .domain([
                    min,
                    max
                ])
                .range([
                    box.innerLeft,
                    box.innerRight
                ]);

            if ( this.filtered ){
                this.filtered.forEach(function( datum ){
                    datum._$interval = scale(datum._$index);
                });
            }
        };

        ComponentView.prototype.parse = function(){
            var min,
                max,
                raw = this.manager.data;

            this._sample();
            
            if ( this.filtered ){
                if ( !this.viewport ){
                    this.viewport = {};
                }

                this.setViewportIntervals( this.offset.$left, this.offset.$right );
                this.normalizer.$follow( this.filtered );

                this.components.forEach(function( component ){
                    var t;

                    if ( component.parse ){
                        t = component.parse();
                        if ( t ){
                            if ( t.min !== null && (!min && min !== 0 || min > t.min) ){
                                min = t.min;
                            }

                            if ( t.max !== null && (!max && max !== 0 || max < t.max) ){
                                max = t.max;
                            }
                        }
                    }
                });

                if ( min !== undefined ){
                    this.setViewportValues( min, max );    

                    if ( this.adjustSettings ){
                        this.adjustSettings(
                            this.filtered.$maxIndex - this.filtered.$minIndex,
                            max - min,
                            raw.$maxIndex - raw.$minIndex
                        );
                    }
                }
            }
        };

        ComponentView.prototype.build = function(){
            this.components.forEach(function( component ){
                if ( component.build ){
                    component.build();
                }
            });
        };

        ComponentView.prototype.process = function(){
            this.components.forEach(function( component ){
                if ( component.process ){
                    component.process();
                }
            });
        };

        ComponentView.prototype.finalize = function(){
            this.components.forEach(function( component ){
                if ( component.finalize ){
                    component.finalize();
                }
            });
        };

        ComponentView.prototype.getPoint = function( pos ){
            return this.normalizer.$getClosest( pos, '_$interval' );
        };

        /*
        ComponentView.prototype.publishStats = function(){
            var i,
                s,
                data = this.dataModel.data,
                step = this.pane.x.$max || 9007199254740991, // max safe int
                count = data.length;

            for( i = 1; i < count; i++ ){
                s = data[i].$x - data[i-1].$x;
                if ( step > s ){
                    step = s;
                }
            }

            return {
                step: step,
                count: data.length,
                bound: {
                    min: this.pane.x.$min,
                    max: this.pane.x.$max
                },
                data: {
                    min: this.dataModel.x.$min,
                    max: this.dataModel.x.$max
                }
            };
        };

        ComponentView.prototype.publishData = function( content, conf, calcPos ){
            publish( this.rawContainer.data, conf.name, content, calcPos, conf.format );
        };

        function fill( content, start, stop, value ){
            while ( start < stop ){
                content[start].push( value );
                start++;
            }
        }
        
        function publish( data, name, content, calcPos, format ){
            var i, c,
                value,
                pos,
                last = 0;

            for( i = 0, c = data.length; i < c; i++ ){
                value = data[i][name];

                if ( value !== undefined && value !== null ){
                    pos = calcPos( data[i] );
                    if ( pos !== last ){
                        fill( content, last, pos, null );
                    }

                    if ( format ){
                        value = format( value );
                    }
                    content[pos].push( value );

                    last = pos + 1;
                }
            }

            fill( content, last, content.length, null );
        }
        */
        return ComponentView;
    }]
);
angular.module( 'vgraph' ).factory( 'DataCollection',
	[
	function () {
		'use strict';

		function bisect( arr, value, func, preSorted ){
			var idx,
				val,
				bottom = 0,
				top = arr.length - 1;

			if ( !preSorted ){
				arr.sort(function(a,b){
					return func(a) - func(b);
				});
			}

			if ( func(arr[bottom]) >= value ){
				return {
					left : bottom,
					right : bottom
				};
			}

			if ( func(arr[top]) <= value ){
				return {
					left : top,
					right : top
				};
			}

			if ( arr.length ){
				while( top - bottom > 1 ){
					idx = Math.floor( (top+bottom)/2 );
					val = func(arr[idx]);

					if ( val === value ){
						top = idx;
						bottom = idx;
					}else if ( val > value ){
						top = idx;
					}else{
						bottom = idx;
					}
				}

				// if it is one of the end points, make it that point
				if ( top !== idx && func(arr[top]) === value ){
					return {
						left : top,
						right : top
					};
				}else if ( bottom !== idx && func(arr[bottom]) === value ){
					return {
						left : bottom,
						right : bottom
					};
				}else{
					return {
						left : bottom,
						right : top
					};
				}
			}
		}

		function isNumeric( value ){
			return value !== null && value !== undefined && typeof(value) !== 'object';
		}

		function DataCollection(){
			this._$index = {};
			this.$dirty = false;
		}

		DataCollection.prototype = [];

		DataCollection.isNumeric = isNumeric;

		DataCollection.prototype._register = function( index, node, shift ){
			var hasValue,
				dex = +index;

			if ( !this._$index[dex] ){
				this._$index[dex] = node;
				
				if ( shift ){
					if ( this.length && dex > this[0]._$index ){
						this.$dirty = true;
					}

					this.unshift(node);
				}else{
					if ( this.length && dex < this[this.length-1]._$index ){
						this.$dirty = true;
					}

					this.push(node);
				}

				Object.keys(node).forEach(function( key ){
					var value = node[key];

					if ( value || value === 0 ){ // truthy
						hasValue = true;
					}
				});

				if ( hasValue ){
					if ( this.$minIndex === undefined ){
						this.$minIndex = dex;
						this.$maxIndex = dex;
					}else if ( this.$maxIndex < dex ){
						this.$maxIndex = dex;
					}else if ( this.$minIndex > dex ){
						this.$minIndex = dex;
					}
				}

				node._$index = dex;
			}

			return node;
		};

		// TODO : $maxNode, $minNode
		// $minIndex, $maxIndex
		DataCollection.prototype._makeNode = function( index ){
			var dex = +index,
				node = this.$getNode( index );

			if ( isNaN(dex) ){
				throw new Error( 'index must be a number, not: '+index+' that becomes '+dex );
			}

			if ( !node ){
				node = {};
				
				this._register( dex, node );
			}

			return node;
		};

		DataCollection.prototype.$getIndexs = function(){
			return Object.keys( this._$index );
		};

		DataCollection.prototype.$getNode = function( index ){
			var dex = +index;
			
			return this._$index[dex];
		};

		DataCollection.prototype._setValue = function ( node, field, value ){
			var dex = node._$index;

			if ( node.$setValue ){
				node.$setValue( field, value );
			}else{
				node[field] = value;	
			}

			if ( value || value === 0 ){
				if ( this.$minIndex === undefined ){
					this.$minIndex = dex;
					this.$maxIndex = dex;
				}else if ( this.$maxIndex < dex ){
					this.$maxIndex = dex;
				}else if ( this.$minIndex > dex ){
					this.$minIndex = dex;
				}
			}
		};

		DataCollection.prototype.$setValue = function( index, field, value ){
			var node = this._makeNode( index );

			this._setValue( node, field, value );

			return node;
		};

		DataCollection.prototype.$addNode = function( index, newNode, shift ){
			var f,
				dex,
				node;

			if ( !newNode ){
				newNode = index;
				dex = newNode._$index;
			}else{
				dex = +index;
			}

			node = this.$getNode( dex );

			if ( node ){
				if ( node.$merge ){
					node.$merge( newNode );
				}else{
					// copy values over
					f = this._setValue.bind( this );
					Object.keys( newNode ).forEach(function( key ){
						if ( key !== '_$index' ){
							f( node, key, newNode[key] );
						}
					});
				}
			}else{
				// just use the existing node
				if ( this.$makeNode ){
					node = this.$makeNode( newNode );
				}else{
					if ( newNode._$index && newNode._$index !== dex ){
						throw new Error( 'something wrong with index -> ', newNode._$index, dex );
					}
					
					node = newNode;
				}
				
				this._register( dex, node, shift );
			}

			return node;
		};

		DataCollection.prototype.$pos = function( value, field ){
			var p;

			if ( !field ){
				field = '_$index';
			}

			this.$sort();

			p = bisect( this, value, function( datum ){
					return datum[field];
				}, true );
			p.field = field;

			return p;
		};

		DataCollection.prototype.$getClosestPair = function( value, field ){
			var p = this.$pos( value, field );
			
			return {
				left: this[p.left],
				right: this[p.right],
				field: p.field
			};
		};

		DataCollection.prototype.$getClosest = function( value, field ){
			var l, r,
				p = this.$getClosestPair(value,field);

			l = value - p.left[p.field];
			r = p.right[p.field] - value;

			return l < r ? p.left : p.right;
		};

		DataCollection.prototype.$sort = function(){
			if ( this.$dirty ){
				this.sort(function(a, b){
					return a._$index - b._$index;
				});

				this.$dirty = false;
			}

			return this;
		};

		DataCollection.prototype.$filter = function( startIndex, stopIndex ){
			var node,
				i = -1,
				filtered = new DataCollection();

			this.$sort();

			do{
				i++;
				node = this[i];
			}while( node && node._$index < startIndex);

			while( node && node._$index <= stopIndex){
				filtered.$addNode( node );
				i++;
				node = this[i];
			}

			filtered.$parent = this;
			
			return filtered;
		};

		/*
		function functionalBucketize( collection, inBucket, inCurrentBucket ){
			var i, c,
				datum,
				currentBucket,
				buckets = [];

			for( i = 0, c = collection.length; i < c; i++ ){
				datum = collection[i];
				if ( inBucket(datum) ){
					if ( !inCurrentBucket(datum) ){
						currentBucket = new DataCollection();
						buckets.push( currentBucket );
					}
				}

				currentBucket.$addNode( datum );
			}
		}

		function numericBucketize( collection, perBucket ){
			var i, c,
				datum,
				currentBucket,
				buckets = [],
				nextLimit = 0;

			for( i = 0, c = collection.length; i < c; i++ ){
				datum = collection[i];
				
				if ( i >= nextLimit ){
					nextLimit += perBucket;
					currentBucket = new DataCollection();
					buckets.push( currentBucket );
				}

				currentBucket.$addNode( datum );
			}
		}

		DataCollection.prototype.$bucketize = function( inBucket, inCurrentBucket, fullStat ){
			if ( typeof(inBucket) === 'function' ){
				if ( arguments.length === 2 ){
					fullStat = this._fullStat;
				}

				return functionalBucketize( this, inBucket, inCurrentBucket, fullStat );
			}else{
				// assume inBucket is an int, number of buckets to seperate into
				if ( arguments.length === 1 ){
					fullStat = this._fullStat;
				}else{
					fullStat = inCurrentBucket;
				}

				return numericBucketize( this, this.length / inBucket, fullStat );
			}
		};
		*/
		return DataCollection;
	}]
);
angular.module( 'vgraph' ).factory( 'DataFeed',
	[ 'makeEventing',
	function ( makeEventing ) {
		'use strict';

		var uid = 1;
            
        function DataFeed( data /* array */, explode ){
            this.explode = explode;
            this.setSource( data );

            this.$$feedUid = uid++;
        }

        DataFeed.prototype.setSource = function( src ){
            var dis = this,
                oldPush = src.push;

            this.data = src;
            this._readPos = 0;

            src.push = function(){
                oldPush.apply( this, arguments );
                dis.$push();
            };

            src.$ready = function(){
                dis.$trigger('ready');
            };

            src.$error = function( err ){
                dis.$trigger( 'error', err );
            };

            src.$reset = function(){
                dis.$trigger( 'reset' );
                dis._readPos = 0;
                dis.data.length = 0;
            };

            this.$push();
        };

        makeEventing( DataFeed.prototype );

        DataFeed.prototype.$push = function(){
            var dis = this;

            if ( !this._$push ){
                this._$push = setTimeout(function(){
                    var t = dis._readNext();

                    if ( t ){
                        dis.$trigger('ready');
                    }

                    while( t ){
                        dis.$trigger( 'data', t );
                        t = dis._readNext();
                    }

                    dis._$push = null;
                }, 0);
            }
        };

        DataFeed.prototype._readAll = function( cb ){
            var t = this._read( 0 );

            while( t ){
                cb( t );
                t = this._read( t.next );
            }
        };

        DataFeed.prototype._readNext = function(){
            var t = this._read( this._readPos );

            if ( t ){
                this._readPos = t.next;
            }

            return t;
        };

        DataFeed.prototype._read = function( pos ){
            var t,
                data = this.data,
                explode = this.explode;

            if ( !data.length || pos >= data.length ){
                return null;
            } else {
                if ( explode ){
                    t = data[pos];
                    return {
                        points: explode( t ),
                        next: pos + 1,
                        ref: t
                    };
                }else{
                    return {
                        points: data.slice(pos),
                        next: data.length
                    };
                }
            }
        };

        return DataFeed;
	}]
);
angular.module( 'vgraph' ).factory( 'DataLoader',
	[
	function () {
		'use strict';

        var uid = 1;

		function DataLoader( feed, dataManager ){
            var dis = this,
                confs = [],
                proc = this._process.bind( this ),
                readyReg = feed.$on( 'ready', function(){
                    dis.ready = true;
                }),
                dataReg = feed.$on( 'data', function( data ){
                    var i, c,
                        j, co;

                    for( i = 0, c = data.points.length; i < c; i++ ){
                        for( j = 0, co = confs.length; j < co; j++ ){
                            proc( confs[j], data.points[i] );
                        }
                    }
                }),
                errorState = feed.$on( 'error', function( error ){
                    dataManager.setError( error );
                }),
                forceReset = feed.$on( 'reset', function(){
                    dataManager.reset();
                    dis.ready = false;
                });

            this.$$loaderUid = uid++;

            this.feed = feed;
            this.confs = confs;
            this.dataManager = dataManager;

            dataManager.$follow( this );
            
            this.$destroy = function(){
                dataManager.$ignore( this );
                errorState();
                forceReset();
                readyReg();
                dataReg();
            };
        }

        DataLoader.unregister = function(){};

        DataLoader.prototype.addConfig = function( cfg ){
            var keys = Object.keys(cfg.readings),
                proc = this._process.bind( this );
            
            keys.forEach(function( key ){
                var fn = cfg.readings[ key ];
                
                if ( typeof(fn) === 'string' ){
                    cfg.readings[key] = function( datum ){
                        return datum[fn];
                    };
                }
            });

            if ( !cfg.parseInterval ){
                cfg.parseInterval = function( datum ){
                    return datum[ cfg.interval ];
                };
            }

            this.feed._readAll(function( data ){
                var i, c,
                    points = data.points;

                for( i = 0, c = points.length; i < c; i++ ){
                    proc( cfg, points[i] );
                }
            });

            this.confs.push(cfg);
        };

        DataLoader.prototype.removeConf = function( /* conf */ ){
            /* TODO
            if ( this.confs[conf.$uid] ){
                delete this.confs[conf.$uid];
            }
            */
        };

        DataLoader.prototype._process = function( cfg, datum ){
            var interval,
                dm = this.dataManager,
                keys = Object.keys(cfg.readings);

            if ( cfg.isDefined && !cfg.isDefined(datum) ){
                return;
            }

            try{
                interval = cfg.parseInterval( datum );
                keys.forEach(function( key ){
                    dm.setValue( interval, key, cfg.readings[key](datum) );
                });
            }catch( ex ){
                console.log( 'failed to load', datum, interval );
                console.log( 'conf:', cfg );
                console.log( ex );
            }
        };

        return DataLoader;
	}]
);
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

angular.module( 'vgraph' ).factory( 'DataNormalizer',
	['DataCollection', 'DataNormalizerNode',
	function ( DataCollection, DataNormalizerNode ) {
		'use strict';

		var uid = 1;

		function DataNormalizer( indexer, nodeFactory ){
			this.$modelUid = uid++;
			this.$stats = {};
			this.$indexer = indexer;
			this.$makeNode = nodeFactory || function( datum ){
				return new DataNormalizerNode(datum);
			};
			DataCollection.call( this );
		}

		DataNormalizer.prototype = new DataCollection();

		DataNormalizer.prototype.$follow = function( collection ){
			var i, c,
				index,
				datum,
				indexer = this.$indexer;

			this.length = 0;
			this._$index = {};

			collection.$sort();
			this.$parent = collection;

			for( i = 0, c = collection.length; i < c; i++ ){
				datum = collection[i];
				index = indexer( datum );

				this.$addNode( index, datum ).$x = datum._$index;
			}

			/*
			TODO : I need to undo this.  I can do the same thing by keeping a _variable$count, 
				_variable$sum and having variable be calculated on the fly
			*/
			for( i = 0, c = this.length; i < c; i++ ){
				this[i].$finalize( this.$stats );
			}
		};
		
		return DataNormalizer;
	}]
);
angular.module( 'vgraph' ).factory( 'DataNormalizerNode',
	[
	function(){
		'use strict';
		
		function DataNormalizerNode( datum ){
			var keys = [];

			this._$minInterval = datum._$interval;
			this._$count = 0;
			this._$interval = 0;

			Object.keys( datum ).forEach(function( key ){
				var ch = key.charAt(0);

				if ( ch !== '_' ){
					keys.push( key );
				}
			});

			this._$keys = keys;
			this.$merge( datum );
		}

		DataNormalizerNode.prototype.$merge = function( datum ){
			var dis = this;

			this._$maxInterval = datum._$interval;
			this._$interval += datum._$interval;
			this._$count++;

			this._$keys.forEach(function( key ){
				if ( !dis[key] && dis[key] !== 0 ){
					dis[key] = datum[key];
				}else{
					dis[key] += datum[key];
				}
			});
		};

		DataNormalizerNode.prototype.$finalize = function( stats ){
			var dis = this,
				count = this._$count,
				index = this._$index;

			this._$interval = this._$interval / count;

			this._$keys.forEach(function( key ){
				var value = dis[key];

				if ( value || value === 0 ){
					if ( stats[key] === undefined || stats[key] < index ){
						stats[key] = index;
					}
					dis[key] = value / count;
				}
			});
		};

		return DataNormalizerNode;
	}]
);
angular.module( 'vgraph' ).factory( 'DrawBox', 
	['DrawBuilder',
	function( DrawBuilder ){
		'use strict';

		function DrawBox( elemental ){
			this.elemental = elemental;
		}

		DrawBox.prototype = new DrawBuilder();

		// default is to have one box per datum, all points valid
		
		function calcBox( x1, x2, y1, y2, box ){
			var t;

			if ( x1 > x2 ){
				t = x1;
				x1 = x2;
				x2 = t;
			}

			if ( y1 > y2 ){
				t = y1;
				y1 = y2;
				y2 = t;
			}

			if ( box.x1 === undefined ){
				box.x1 = x1;
				box.x2 = x2;
				box.y1 = y1;
				box.y2 = y2;
			}else{
				if ( box.x1 > x1 ){
					box.x1 = x1;
				}

				if ( x2 > box.x2 ){
					box.x2 = x2;
				}

				if ( box.y1 > y1 ){
					box.y1 = y1;
				}

				if ( y2 > box.y2 ){
					box.y2 = y2;
				}
			}

			return box;
		}

		DrawBox.prototype.makeSet = function(){
			return {};
		};

		DrawBox.prototype.isValidSet = function( box ){
			return box.x1 !== undefined;
		};

		DrawBox.prototype.mergeSet = function( parsed, set ){
			var x1 = parsed.x1,
				x2 = parsed.x2,
				y1 = parsed.y1,
				y2 = parsed.y2;

			if ( y1 !== null && y2 !== null ){
				if ( y1 === undefined ){
					y1 = set.y1;
				}else{
					y1 = this.scale1(y1);
				}

				if ( y2 === undefined ){
					y2 = set.y2;
				}else{
					y2 = this.scale2(y2);
				}

				calcBox( x1, x2, y1, y2, set );
			}else{
				return true;	
			}
		};

		DrawBox.prototype.makePath = function( boxInfo ){
			if ( boxInfo ){
				return 'M' + 
					(boxInfo.x1+','+boxInfo.y1) + 'L' +
					(boxInfo.x2+','+boxInfo.y1) + 'L' +
					(boxInfo.x2+','+boxInfo.y2) + 'L' +
					(boxInfo.x1+','+boxInfo.y2) + 'Z';
			}
		};

		DrawBox.prototype.makeElement = function( boxInfo ){
			if ( boxInfo ){
				return '<rect x="'+boxInfo.x1+
					'" y="'+boxInfo.y1+
					'" width="'+(boxInfo.x2 - boxInfo.x1)+
					'" height="'+(boxInfo.y2 - boxInfo.y1)+'"/>';
			}
		};
		
		return DrawBox;
	}]
);
angular.module( 'vgraph' ).factory( 'DrawBuilder', 
	[
	function(){
		'use strict';

		function DrawBuilder( references ){
			this.references = references;
		}

		DrawBuilder.isNumeric = function( v ){
            if ( v === null ){
                return false;
            }else if ( Number.isFinite ){
                return Number.isFinite(v) && !Number.isNaN(v);
            }else{
                return isFinite(v) && !isNaN(v);
            }
        };

		// allows for very complex checks of if the value is defined, allows checking previous and next value
		DrawBuilder.prototype.preparse = function( d ){
			return d;
		};

		DrawBuilder.prototype.makeSet = function(){
			return [];
		};

		DrawBuilder.prototype.mergeSet = function( d, set ){
			if ( d ){
				set.push( d );
				return false;
			}else{
				return true;
			}
		};

		DrawBuilder.prototype.isValidSet = function( set ){
			return set.length !== 0;
		};

		DrawBuilder.prototype.convert = function( keys ){
			return this.parse( keys );
		};

		DrawBuilder.prototype.parse = function( keys ){
			var i, c,
				t,
				breakSet,
				set = this.makeSet(),
				sets = [],
				mergeSet = this.mergeSet.bind(this);

			// I need to start on the end, and find the last valid point.  Go until there
			for( i = 0, c = keys.length; i < c; i++ ){
				t = this.preparse(keys[i]);
				
				if ( t ){
					breakSet = mergeSet( 
						t,
						set
					);
				} else {
					breakSet = true;
				} 

				if ( breakSet && this.isValidSet(set) ){
					sets.push( set );
					set = this.makeSet();
				}
			}

			if ( this.isValidSet(set) ){
				sets.push( set );
			}

			return sets;
		};

		DrawBuilder.prototype.makeElement = function( convertedSet ){
			console.log( 'makeElement', convertedSet );
			return '<text>Element not overriden</text>';
		};

		DrawBuilder.prototype.makePath = function( convertedSet ){
			console.log( 'makePath', convertedSet );
			return 'M0,0Z';
		};

		return DrawBuilder;
	}]
);
angular.module( 'vgraph' ).factory( 'DrawFill', 
	['DrawBuilder',
	function( DrawBuilder ){
		'use strict';
		
		function DrawFill(){}

		DrawFill.prototype = new DrawBuilder();

		DrawFill.prototype.mergeSet = function( parsed, set ){
			var x = parsed.x,
				y1 = parsed.y1,
				y2 = parsed.y2,
				last = set[set.length-1];

			if ( DrawBuilder.isNumeric(y1) && DrawBuilder.isNumeric(y2) ){
                set.push({
                	x: x,
                	y1: this.scale1(y1),
                	y2: this.scale2(y2)
                });
            } else if ( !last || y1 === null || y2 === null ){
            	return true;
            } else {
            	if ( y1 === undefined ){
					y1 = last.y1;
				}else{
					y1 = this.scale1(y1);
				}

				if ( y2 === undefined && last ){
					y2 = last.y2;
				}else{
					y2 = this.scale2(y2);
				}

                set.push({
                	x: x,
                	y1: y1,
                	y2: y2
                });
            }
		};

		DrawFill.prototype.makePath = function( set ){
			var i, c,
				point,
				line1 = [],
				line2 = [];

			if ( set.length ){
				for( i = 0, c = set.length; i < c; i++ ){
					point = set[i];
					
					line1.push( point.x+','+point.y1 );
					line2.unshift( point.x+','+point.y2 );
				}

				return 'M' + line1.join('L') + 'L' + line2.join('L') + 'Z';
			}
		};

		DrawFill.prototype.makeElement = function( set ){
			return '<path d="'+this.makePath(set)+'"></path>';
		};

		return DrawFill;
	}]
);
angular.module( 'vgraph' ).factory( 'DrawIcon', 
	[ 'DrawBox',
	function( DrawBox ){
		'use strict';
		
		function DrawIcon( box, template ){
			this.box = box;
			this.template = template;
			this.elemental = true;
		}

		DrawIcon.prototype = new DrawBox();

		DrawIcon.prototype.makeElement = function( boxInfo ){
			var x, y;
			
			if ( boxInfo ){
				x = (boxInfo.x1 + boxInfo.x2 - this.box.width ) / 2; // v / 2 - width / 2 
				y = (boxInfo.y1 + boxInfo.y2 - this.box.height ) / 2;

				return '<g transform="translate('+x+','+y+')">' + this.template + '</g>';
			}
		};

		return DrawIcon;
	}]
);
angular.module( 'vgraph' ).factory( 'DrawLine', 
	['DrawBuilder',
	function( DrawBuilder ){
		'use strict';
		
		function DrawLine(){}

		DrawLine.prototype = new DrawBuilder();

		DrawLine.prototype.mergeSet = function( parsed, set ){
			var x = parsed.x,
				y = parsed.y,
				last = set[set.length-1];

			if ( DrawBuilder.isNumeric(y) ){
                set.push({
                	x: x,
                	y: this.scale(y)
                });
            }else if ( last && y === undefined ){
                set.push({
                	x: x,
                	y: last.y
                });
            }else{
                return true;
            }
		};

		DrawLine.prototype.makePath = function( set ){
			var i, c,
				point,
				res = [];

			if ( set.length ){
				for( i = 0, c = set.length; i < c; i++ ){
					point = set[i];
					res.push( point.x + ',' + point.y );
				}

				return 'M' + res.join('L');
			}
		};

		DrawLine.prototype.makeElement = function( set ){
			if ( set.length ){
				return '<path d="'+this.makePath(set)+'"></path>';
			}
		};

		return DrawLine;
	}]
);
angular.module( 'vgraph' ).factory( 'StatCalculations',
    [
    function () {
        'use strict';

        function isNumeric( v ){
            if ( v === null ){
                return false;
            }else if ( Number.isFinite ){
                return Number.isFinite(v) && !Number.isNaN(v);
            }else{
                return isFinite(v) && !isNaN(v);
            }
        }

        function createNames( config, prefix ){
            var arr = [];

            config.forEach(function(cfg){
                arr.push( '$'+prefix+'$'+cfg.field );
            }); 

            return arr;
        }

        return {
            $resetCalcs: function( config ){
                var i, c;

                for( i = 0, c = config.length; i < c; i++ ){
                    config[i].field = config[i].name;
                }
            },
            $getFields: function( config ){
                var i, c,
                    fields = [];

                for( i = 0, c = config.length; i < c; i++ ){
                    fields.push( config[i].field );
                }

                return fields;
            },
            $setFields: function( config, calcedFields ){
                var i, c;

                for( i = 0, c = config.length; i < c; i++ ){
                    config[i].field = calcedFields[i];
                }
            },
            /*
            sum: function( config, collection ){
                var nameAs = createNames( config, 'sum' );

                config.forEach(function( cfg, key ){
                    var field = cfg.field,
                        alias = nameAs[key],
                        sum = 0;

                    collection.forEach(function( datum ){
                        var v = datum[field];

                        if ( v ){
                            sum += v;
                        }
                    });

                    collection[ alias ] = sum;
                    cfg.field = alias;
                });

                return nameAs;
            },
            average: function( config, collection ){
                var nameAs = createNames( config, 'average' );

                config.forEach(function( cfg, key ){
                    var field = cfg.field,
                        alias = nameAs[key],
                        sum = 0,
                        count = 0;

                    collection.forEach(function( datum ){
                        var v = datum[field];

                        if ( v ){
                            sum += v;
                            count++;
                        }else if ( v === 0 ){
                            count++;
                        }
                    });

                    collection[ alias ] = sum / count;
                    cfg.field = alias;
                });

                return nameAs;
            },
            */
            stack: function( config ){
                var i, c,
                    j, co,
                    v,
                    sum,
                    dex,
                    cfg,
                    datum,
                    nameAs = createNames( config, 'stack' ),
                    indexs = this.indexs( config );

                co = config.length;
                for( i = 0, c = indexs.length; i < c; i++ ){
                    sum = 0;
                    dex = indexs[i];

                    for( j = 0; j < co; j++ ){
                        cfg = config[j];
                        datum = cfg.$getNode(dex);
                        v = cfg.getValue(datum) || 0;

                        sum += v;

                        datum[ nameAs[j] ] = sum;
                    }
                }

                for( j = 0; j < co; j++ ){
                    config[j].field = nameAs[j];
                }

                return nameAs;
            },
            limits: function( cfg ){
                var i, c,
                    v,
                    min,
                    max;

                if ( angular.isArray(cfg) ){
                    // go through an array of names
                    for( i = 0, c = cfg.length; i < c; i++ ){
                        v = this.limits( cfg[i] );
                        if ( min === undefined ){
                            min = v.min;
                            max = v.max;
                        }else{
                            if ( v.min < min ){
                                min = v.min;
                            }

                            if ( v.max > max ){
                                max = v.max;
                            }
                        }
                    }
                } else if ( cfg && cfg.getValue ){
                    // used to reduce the checks for parser
                    cfg.$eachNode(function(node){
                        v = cfg.getValue(node);
                        if ( isNumeric(v) ){
                            if ( min === undefined ){
                                min = v;
                                max = v;
                            }else if ( min > v ){
                                min = v;
                            }else if ( max < v ){
                                max = v;
                            }
                        }
                    });
                }

                return {
                    min : min,
                    max : max
                };
            },
            indexs: function( cfg ){
                // Need to calculate the indexs of the data.  Multiple references might have different views
                // TOOD : this is most likely suboptimal, I'd like to improve
                var indexs,
                    seen = {};
                
                if ( cfg.length === 1 ){
                    indexs = cfg[0].$getIndexs();
                }else{
                    indexs = [];

                    cfg.forEach(function( ref ){
                        indexs = indexs.concat( ref.$getIndexs() );
                    });

                    indexs = indexs.filter(function(x) {
                        if ( seen[x] ){
                            return;
                        }
                        seen[x] = true;
                        return x;
                    });
                }

                return indexs;
            }
        };
    }]
);

    /*
    - ticks
    - tick buffer
    - label offset from tick labels
    - label collisions
    */

angular.module( 'vgraph' ).directive( 'vgraphAxis',
    [
    function() {
        'use strict';

        function collides( p, b ){ // point and boundry
            return !(
                p.bottom < b.top ||
                p.top > b.bottom ||
                p.right < b.left ||
                p.left > b.right
            );
        }

        return {
            scope : {
                orient : '=vgraphAxis',
                adjust : '=axisAdjust',
                rotation : '=tickRotation'
            },
            require : ['^vgraphChart'],
            link : function( scope, el, attrs, requirements ){
                var graph = requirements[0],
                    view = graph.getView( attrs.view || 'default' ),
                    makeTicks,
                    express,
                    axis = d3.svg.axis(),
                    className= 'axis',
                    box = graph.box,
                    labelOffset = 0,
                    tickRotation = null,
                    labelClean = true,
                    labelEndpoints = false,
                    ticks,
                    tickLength = parseInt( attrs.tickLength ) || 0,
                    tickPadding = parseInt( attrs.tickPadding ) || 3,
                    tickMargin = parseInt( attrs.tickMargin ) || 0,
                    min,
                    max,
                    $ticks,
                    $tickMarks,
                    $tickMargin,
                    $axisLabel,
                    $axisPadding,
                    $axisLabelWrap,
                    $el = d3.select( el[0] );

                $el.attr( 'visibility', 'hidden' );

                $ticks = $el.append( 'g' ).attr( 'class', 'ticks' );
                $axisPadding = $el.append( 'g' ).attr( 'class', 'padding' );
                $tickMarks = $axisPadding.append( 'g' )
                    .attr( 'class', 'tick-marks' );
                $tickMargin = $axisPadding.append( 'rect' )
                    .attr( 'class', 'tick-margin' );
                $axisLabelWrap = $el.append( 'g' ).attr( 'class', 'label-wrap' );

                if ( attrs.tickRotation ){
                    tickRotation = parseInt( attrs.tickRotation, 10 ) % 360;
                }

                if ( attrs.labelOffset ){
                    labelOffset = scope.$eval( attrs.labelOffset );
                }

                if ( attrs.labelClean ){
                    labelClean = scope.$eval( attrs.labelClean );
                }

                if ( attrs.labelEndpoints ){
                    labelEndpoints = scope.$eval( attrs.labelEndpoints );
                }

                if ( attrs.axisLabel ){
                    $axisLabel = $axisLabelWrap.append( 'text' )
                        .attr( 'class', 'axis-label label' );

                    scope.$parent.$watch(attrs.axisLabel, function( label ){
                        $axisLabel.text( label );
                    });
                }

                makeTicks = function(){
                    if ( attrs.tickMarks ){
                        axis.tickValues( scope.$eval(attrs.tickMarks) );

                        ticks = [];
                    }else if ( attrs.tickCount ){
                        axis.ticks( scope.$eval(attrs.tickCount) );

                        ticks = [];
                    }else{
                        axis.ticks( 10 );

                        ticks = [];
                    }
                };

                switch( scope.orient ){
                    case 'top' :
                        express = function(){
                            var axisMaxMin;

                            $el.attr( 'class', className + ' x top' )
                                .attr( 'transform', 'translate('+box.left+','+(box.top-tickLength)+')' )
                                .attr( 'width', box.width )
                                .attr( 'height', box.padding.top );

                            if ( $axisLabel ){
                                $axisLabel.attr( 'text-anchor', 'middle' )
                                    .attr( 'x', box.width / 2 )
                                    .attr( 'y', box.padding.top - labelOffset );
                            }

                            if ( tickMargin ){
                                $tickMargin
                                    .attr( 'height', tickMargin )
                                    .attr( 'width', box.innerWidth )
                                    .attr( 'x', 0 )
                                    .attr( 'y', -tickMargin );
                            }

                            $tickMarks.attr( 'transform', 'translate(-'+box.margin.left+',0)' );

                            if ( ticks ){
                                axis.orient('top')
                                    .tickFormat( view.x.format )
                                    .innerTickSize( -(box.innerHeight + tickLength + tickMargin) )
                                    .outerTickSize( 0 )
                                    .tickPadding( tickPadding + tickLength + tickMargin )
                                    .scale( view.x.scale );

                                if ( view.x.tick ){
                                    axis.ticks(
                                        view.x.tick.interval,
                                        view.x.tick.step
                                    );
                                }

                                $ticks.attr( 'transform', 'translate(-'+box.margin.left+','+box.padding.top+')' )
                                    .call( axis );

                                axisMaxMin = $el.selectAll('g.axis-cap').data( view.x.scale.domain() );

                                if ( labelEndpoints ){
                                    axisMaxMin.enter().append('g').attr('class', function(d,i){
                                            return 'axis-cap ' + ( i ? 'axis-max' : 'axis-min' );
                                        })
                                        .append('text');

                                    axisMaxMin.exit().remove();

                                    axisMaxMin.attr('transform', function( d ){
                                            return 'translate(' + ( view.x.scale(d) - box.margin.left ) + ',0)';
                                        })
                                        .select( 'text' )
                                            .text( function(d) {
                                                var v = view.x.format( d );
                                                return ('' + v).match('NaN') ? '' : v;
                                            })
                                            .attr( 'dy', '-0.25em')
                                            .attr( 'y', box.padding.top )
                                            .attr( 'text-anchor', 'middle');
                                }

                                if ( tickRotation ){
                                    if ( $ticks.select('.tick text')[0][0] === null ){
                                        return;
                                    }

                                    $ticks.selectAll('.tick text')
                                        .attr( 'transform', 'translate(0,'+$ticks.select('.tick text').attr('y')+') rotate(' + tickRotation + ',0,0)' )
                                        .attr( 'y', '0' )
                                        .style( 'text-anchor', tickRotation%360 > 0 ? 'end' : 'start' );

                                    axisMaxMin.select('text')
                                        .attr( 'transform', 'rotate(' + tickRotation + ',0,0)' )
                                        .style( 'text-anchor', scope.rotation%360 > 0 ? 'end' : 'start' );
                                }
                            }
                        };
                        break;


                    case 'bottom' :
                        express = function(){
                            var axisMaxMin;

                            $el.attr( 'class', className + ' x bottom' )
                                .attr( 'transform',
                                    'translate('+box.left+','+box.innerBottom+')'
                                )
                                .attr( 'width', box.width )
                                .attr( 'height', box.padding.bottom );

                            if ( $axisLabel ){
                                $axisLabel.attr( 'text-anchor', 'middle' )
                                    .attr( 'x', box.width / 2 )
                                    .attr( 'y', box.padding.bottom + labelOffset );
                            }

                            if ( tickMargin ){
                                $tickMargin
                                    .attr( 'height', tickMargin )
                                    .attr( 'width', box.innerWidth )
                                    .attr( 'x', 0 )
                                    .attr( 'y', 0 );
                            }

                            $tickMarks.attr( 'transform', 'translate(-'+box.margin.left+',0)' );

                            if ( ticks ){
                                axis.orient('bottom')
                                    .tickFormat( view.x.format )
                                    .innerTickSize( box.innerHeight + tickLength + tickMargin )
                                    .outerTickSize( 0 )
                                    .tickPadding( tickPadding + tickLength + tickMargin )
                                    .scale( view.x.scale );

                                if ( view.x.tick ){
                                    axis.ticks(
                                        view.x.tick.interval,
                                        view.x.tick.step
                                    );
                                }

                                $ticks.attr( 'transform', 'translate(-'+box.margin.left+','+(-box.innerHeight)+')' )
                                    .call( axis );

                                axisMaxMin = $el.selectAll('g.axis-cap').data( view.x.scale.domain() );

                                if ( labelEndpoints ){
                                    axisMaxMin.enter().append('g').attr('class', function(d,i){
                                            return 'axis-cap ' + ( i ? 'axis-max' : 'axis-min' );
                                        })
                                        .append('text');

                                    axisMaxMin.exit().remove();

                                    axisMaxMin.attr('transform', function( d ){
                                            return 'translate(' + ( view.x.scale(d) - box.margin.left ) + ',0)';
                                        })
                                        .select( 'text' )
                                            .text( function(d) {
                                                var v = view.x.format( d );
                                                return ('' + v).match('NaN') ? '' : v;
                                            })
                                            .attr( 'dy', '1em')
                                            .attr( 'y', 0 )
                                            /*
                                            .attr( 'x', function(){
                                                return -d3.select(this).node().getComputedTextLength() / 2;
                                            })
                                            */
                                            .attr( 'text-anchor', 'middle');
                                }

                                if ( tickRotation ){
				                    if ( $ticks.select('.tick text')[0][0] === null ){
                                        return;
                                    }
                                
                                    $ticks.selectAll('.tick text')
                                        .attr( 'transform', function(){
                                            return 'translate(0,' + d3.select(this).attr('y') + ') rotate(' + tickRotation + ',0,0)';
                                        })
                                        .attr( 'y', '0' )
                                        .style( 'text-anchor', tickRotation%360 > 0 ? 'start' : 'end' );

                                    axisMaxMin.select('text')
                                        .attr( 'transform', 'rotate(' + tickRotation + ',0,0)' )
                                        .style( 'text-anchor', scope.rotation%360 > 0 ? 'start' : 'end' );
                                }
                            }
                        };
                        break;

                    case 'right' :
                        express = function(){
                            var axisMaxMin;
                            
                            $el.attr( 'class', className + ' y right' )
                                .attr( 'transform',
                                    'translate('+tickLength+','+box.top+')'
                                )
                                .attr( 'width', box.padding.right )
                                .attr( 'height', box.height );

                            $axisLabelWrap.attr( 'transform',
                                'translate('+(box.right-box.padding.right)+','+box.height+') rotate( 90 )'
                            );

                            if ( $axisLabel ){
                                $axisLabel.attr( 'text-anchor', 'middle' )
                                    .attr( 'x', -(box.height / 2) )
                                    .attr( 'y', -labelOffset );
                            }

                            if ( tickMargin ){
                                $tickMargin
                                    .attr( 'height', box.innerHeight )
                                    .attr( 'width', tickMargin )
                                    .attr( 'x', -tickMargin )
                                    .attr( 'y', 0 );
                            }

                            $tickMarks.attr( 'transform', 'translate(-'+box.padding.right+','+(-box.top||0)+')' );

                            if ( ticks ){
                                axis.orient('right')
                                    .tickFormat( view.y.format )
                                    .innerTickSize( -(box.innerWidth + tickLength + tickMargin) )
                                    .outerTickSize( 0 )
                                    .tickPadding( tickPadding + tickLength + tickMargin )
                                    .scale( view.y.scale );

                                if ( view.y.tick ){
                                    axis.ticks(
                                        view.y.tick.interval,
                                        view.y.tick.step
                                    );
                                }

                                $ticks.attr('transform', 'translate('+(box.innerRight)+','+(-box.top||0)+')');
                                $ticks.call( axis );
                                $ticks.select('.domain').attr( 'transform', 'translate('+( tickLength + tickMargin )+',0)' );

                                if ( labelEndpoints ){
                                    axisMaxMin = $el.selectAll('g.axis-cap').data( view.y.scale.domain() );

                                    axisMaxMin.enter().append('g').attr('class', function(d,i){
                                            return 'axis-cap ' + ( i ? 'axis-max' : 'axis-min' );
                                        })
                                        .append('text');

                                    axisMaxMin.exit().remove();

                                    axisMaxMin.attr('transform', function( d ){
                                            return 'translate(0,' + ( view.y.scale(d) - box.margin.top ) + ')';
                                        })
                                        .select( 'text' )
                                            .text( function(d) {
                                                var v = view.y.format( d );
                                                return ('' + v).match('NaN') ? '' : v;
                                            })
                                            .attr( 'dy', '.25em')
                                            .attr( 'x', box.padding.left - axis.tickPadding() )
                                            .attr( 'text-anchor', 'end');
                                }
                            }
                        };
                        break;


                    case 'left' :
                        express = function(){
                            var axisMaxMin;

                            $el.attr( 'class', className + ' y left' )
                                .attr( 'transform',
                                    'translate('+box.left+','+box.top+')'
                                )
                                .attr( 'width', box.padding.left )
                                .attr( 'height', box.height );

                            $axisLabelWrap.attr( 'transform',
                                'translate('+box.padding.left+','+box.height+') rotate( -90 )'
                            );

                            if ( $axisLabel ){
                                $axisLabel.attr( 'text-anchor', 'middle' )
                                    .attr( 'x', box.height / 2 )
                                    .attr( 'y', -labelOffset );
                            }

                            if ( tickMargin ){
                                $tickMargin
                                    .attr( 'height', box.innerHeight )
                                    .attr( 'width', tickMargin )
                                    .attr( 'x', -tickMargin )
                                    .attr( 'y', 0 );
                            }

                            $tickMarks.attr( 'transform', 'translate('+box.padding.left+','+(-box.top||0)+')' );

                            if ( ticks ){
                                axis.orient('left')
                                    .tickFormat( view.y.format )
                                    .innerTickSize( -(box.innerWidth + tickLength + tickMargin) )
                                    .outerTickSize( 0 )
                                    .tickPadding( tickPadding + tickLength + tickMargin )
                                    .scale( view.y.scale );

                                if ( view.y.tick ){
                                    axis.ticks(
                                        view.y.tick.interval,
                                        view.y.tick.step
                                    );
                                }

                                $ticks.attr('transform', 'translate('+(box.padding.left - tickLength - tickMargin )+','+(-box.top||0)+')')
                                    .call( axis );

                                $ticks.select('.domain').attr( 'transform', 'translate('+( tickLength + tickMargin )+',0)' );

                                if ( labelEndpoints ){
                                    axisMaxMin = $el.selectAll('g.axis-cap').data( view.y.scale.domain() );

                                    axisMaxMin.enter().append('g').attr('class', function(d,i){
                                            return 'axis-cap ' + ( i ? 'axis-max' : 'axis-min' );
                                        })
                                        .append('text');

                                    axisMaxMin.exit().remove();

                                    axisMaxMin.attr('transform', function( d ){
                                            return 'translate(0,' + ( view.y.scale(d) - box.margin.top ) + ')';
                                        })
                                        .select( 'text' )
                                            .text( function(d) {
                                                var v = view.y.format( d );
                                                return ('' + v).match('NaN') ? '' : v;
                                            })
                                            .attr( 'dy', '.25em')
                                            .attr( 'x', box.padding.left - axis.tickPadding() )
                                            .attr( 'text-anchor', 'end');
                                }
                            }
                        };
                        break;
                }

                function hide(){
                    $el.attr( 'visibility', 'hidden' );
                }

                scope.$on('$destroy',
                    graph.$subscribe({
                        'error': hide,
                        'loading': hide
                    })
                );

                graph.registerComponent({
                    build : function(){
                        if ( ticks === undefined ){
                            makeTicks();
                        }

                        express();
                    },
                    process : function(){
                        ticks.length = 0;

                        if ( tickLength ){
                            $ticks.selectAll('.tick text').each(function( d ){
                                ticks.push({
                                    el : this,
                                    val : d,
                                    position : this.getBoundingClientRect()
                                });
                            });

                            ticks.sort(function( a, b ){
                                var t = a.position.top - b.position.top;

                                if ( t ){
                                    return t;
                                }else{
                                    return a.position.left - b.position.left;
                                }
                            });
                        }

                        if ( labelClean ){
                            min = $el.select( '.axis-min text' ).node();
                            if ( min ){
                                min = min.getBoundingClientRect();
                            }

                            max = $el.select( '.axis-max text' ).node();
                            if ( max ){
                                max = max.getBoundingClientRect();
                            }
                        }
                    },
                    finalize : function(){
                        var data = view.filtered,
                            valid,
                            t,
                            p,
                            i, c,
                            change,
                            boundry = {};

                        if ( !data.length ){
                            $el.attr( 'visibility', 'hidden' );
                            return;
                        }

                        $el.attr( 'visibility', '' );

                        $tickMarks.selectAll('line').remove();

                        for( i = 0, c = ticks.length; i < c; i++ ){
                            valid = true;
                            t = ticks[ i ];
                            p = t.position;

                            if ( labelClean && min && (collides(p,min) || collides(p,max)) ){
                                t.el.setAttribute( 'class', 'collided' );
                                valid = false;
                            }else if ( boundry.left === undefined ){
                                boundry.left = p.left;
                                boundry.right = p.right;
                                boundry.width = p.width;
                                boundry.top = p.top;
                                boundry.bottom = p.bottom;
                                boundry.height = p.height;

                                t.el.setAttribute( 'class', '' );
                            }else{
                                if ( labelClean && collides(p,boundry) ){
                                    t.el.setAttribute( 'class', 'collided' );
                                    valid = false;
                                }else{
                                    change = false;
                                    if ( p.left < boundry.left ){
                                        boundry.left = p.left;
                                        change = true;
                                    }

                                    if ( p.right > boundry.right ){
                                        boundry.right = p.right;
                                        change = true;
                                    }

                                    if ( change ){
                                        boundry.width = boundry.right - boundry.left;
                                        change = false;
                                    }

                                    if ( p.top < boundry.top ){
                                        boundry.top = p.top;
                                        change = true;
                                    }

                                    if ( p.bottom > boundry.bottom ){
                                        boundry.bottom = p.bottom;
                                        change = true;
                                    }

                                    if ( change ){
                                        boundry.height = boundry.bottom - boundry.top;
                                    }

                                    t.el.setAttribute( 'class', '' );
                                }
                            }
                        }
                    }
                }, 'axis-'+scope.orient);
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphBar',
    [ 'ComponentGenerator', 'StatCalculations', 'ComponentElement',
    function( ComponentGenerator, StatCalculations, ComponentElement ) {
        'use strict';

        return {
            scope : {
                config: '=vgraphBar',
                pair: '=?pair'
            },
            require : ['^vgraphChart','vgraphBar'],
            controller: ComponentElement,
            link : function( scope, $el, attrs, requirements ){
                var el = $el[0],
                    chart = requirements[0],
                    cfg = chart.compileReference( scope.config ),
                    pair = chart.compileReference( scope.pair ),
                    element = requirements[1],
                    className = 'bar ';

                element.setElement( el );
                element.setDrawer(
                    ComponentGenerator.makeBarCalc( cfg, pair, attrs.width )
                );
                element.setReferences([cfg,pair]);

                element.register = function( data, element ){
                    chart.registerElement( data, element );
                };

                if ( cfg.classExtend ){
                    className += cfg.classExtend + ' ';
                }

                className += attrs.className || cfg.className;

                el.setAttribute( 'class', className );

                cfg.$view.registerComponent(element);
            }
        };
    } ]
);
angular.module( 'vgraph' ).directive( 'vgraphBox',
    [ 'ComponentGenerator', 'StatCalculations', 'ComponentElement',
    function( ComponentGenerator, StatCalculations, ComponentElement ) {
        'use strict';

        return {
            scope : {
                config: '=vgraphBox'
            },
            require : ['^vgraphChart','vgraphBox'],
            controller: ComponentElement,
            link : function( scope, $el, attrs, requirements ){
                var el = $el[0],
                    chart = requirements[0],
                    cfg = chart.compileReference( scope.config ),
                    /*
                        if  cfg.getValue == null || false, it will cover the entire area
                        cfg.isValid
                    */
                    element = requirements[1],
                    className = 'box ';

                element.setElement( el );
                element.setDrawer(
                    ComponentGenerator.makeBoxCalc( cfg )
                );
                element.setReferences(cfg);

                element.register = function( data, element ){
                    chart.registerElement( data, element );
                };

                if ( cfg.classExtend ){
                    className += cfg.classExtend + ' ';
                }

                className += attrs.className || cfg.className;

                el.setAttribute( 'class', className );

                cfg.$view.registerComponent(element);
            }
        };
    }]
);
angular.module( 'vgraph' ).directive( 'vgraphChart',
    [ 'ComponentChart',
    function( ComponentChart ){
        'use strict';

        function resize( box ){
            if ( box.$mat && box.innerWidth ){
                // this isn't the bed way to do it, but since I'm already planning on fixing stuff up, I'm leaving it
                box.$mat.attr( 'class', 'mat' )
                    .attr( 'width', box.innerWidth )
                    .attr( 'height', box.innerHeight )
                    .attr( 'transform', 'translate(' +
                        box.innerLeft + ',' +
                        box.innerTop + ')'
                    );

                box.$frame.attr( 'class', 'frame' )
                    .attr( 'width', box.width )
                    .attr( 'height', box.height )
                    .attr( 'transform', 'translate(' +
                        box.left + ',' +
                        box.top + ')'
                    );
            }
        }

        return {
            scope : {
                settings : '=vgraphChart',
                interface : '=?interface'
            },
            controller : ComponentChart,
            require : ['vgraphChart','^vgraphPage'],
            link: function ( $scope, $el, $attrs, requirements ){
                var el,
                    page = requirements[1],
                    graph = requirements[0],
                    box = graph.box;

                if ( $el[0].tagName === 'svg' ){
                    el = $el[0];
                }else{
                    el = $el.find('svg')[0];
                }

                graph.$root = $el[0]; 

                box.$on('resize',function(){
                    resize( box );
                    graph.rerender(function(){
                        $scope.$apply();
                    });
                });

                box.targetSvg( el );

                box.$mat = d3.select( el ).insert( 'rect',':first-child' );
                box.$frame = d3.select( el ).insert( 'rect',':first-child' );

                resize( box );

                $scope.$watch('settings', function( settings ){
                    graph.configure( page, settings );
                });

                if ( $scope.interface ){
                    $scope.interface.resize = box.resize.bind( box );
                    $scope.interface.error = graph.error.bind( graph );
                    // TODO : clear, reset
                }

                if ( $attrs.name ){
                    page.setChart( $attrs.name, graph );
                }
            },
            restrict: 'A'
        };
    }]
);

angular.module( 'vgraph' ).directive( 'vgraphCompare',
    [ '$compile', 'ComponentElement',
    function( $compile, ComponentElement ) {
        'use strict';

        return {
            scope : {
                config1: '=config1',
                config2: '=config2'
            },
            require : ['^vgraphChart'],
            link : function( scope, $el, attrs, requirements ){
                var unsubscribe,
                    graph = requirements[0],
                    ref1 = graph.getReference( scope.config1 ),
                    ref2 = graph.getReference( scope.config2 ),
                    element = ComponentElement.svgCompile( 
                        '<g><path vgraph-line="config1" pair="config2" class-name="'+
                            (attrs.className||'')+
                        '"></path></g>'
                    )[0];

                $el[0].appendChild( element );
                $compile( element )( scope );

                unsubscribe = graph.$on( 'focus-point', function( point ){
                    var p1 = point[ref1.view],
                        p2 = point[ref2.view],
                        view1 = ref1.$view,
                        view2 = ref2.$view,
                        v1 = ref1.getValue(p1),
                        v2 = ref2.getValue(p2);

                    point[ attrs.reference || 'compare' ] = {
                        value: Math.abs( v1 - v2 ),
                        y: ( view1.y.scale(v1) + view2.y.scale(v2) ) / 2,
                        x: ( p1._$interval + p2._$interval ) / 2
                    };
                });

                scope.$on('$destroy', unsubscribe );
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphFocus',
    [
    function(){
        'use strict';

        return {
            require : ['^vgraphChart'],
            link : function( scope, el, attrs, requirements ){
                var graph = requirements[0],
                    box = graph.box,
                    $el = d3.select( el[0] ),
                    $focus = $el.append( 'rect' )
                        .attr('class', 'focus')
                        .attr('visibility', 'hidden');

                box.$on('resize',function(){
                    $focus.attr( 'height', box.innerHeight )
                        .attr( 'y', box.innerTop );
                });

                scope.$watch('follow', function( value ){
                    var xDiff,
                        start,
                        stop;

                    if ( value && value.xDiff !== undefined ){
                        xDiff = Math.abs( value.xDiff );

                        start = value.x0 - xDiff;
                        stop = value.x0 + xDiff;

                        $focus.attr( 'visibility', 'visible' );

                        if ( start > box.innerLeft ){
                            $focus.attr( 'x', start );
                        }else{
                            start = box.innerLeft;
                            $focus.attr( 'x', box.innerLeft );
                        }
                        
                        if ( stop > box.innerRight ){
                            $focus.attr( 'width', box.innerRight - start );
                        }else{
                            $focus.attr( 'width', stop - start );
                        }
                    }
                });

                scope.$watch('stop', function( value ){
                    var xDiff,
                        start,
                        stop,
                        offset,
                        currentWidth;

                    if ( value ){
                        $focus.attr( 'visibility', 'hidden' );

                        xDiff = Math.abs( value.xDiff );

                        if ( xDiff > 3 ){
                            start = value.x0 - xDiff;
                            stop = value.x0 + xDiff;

                            if ( start < box.innerLeft ){
                                start = 0;
                            }else{
                                start = start - box.innerLeft;
                            }

                            if ( stop > box.innerRight ){
                                stop = box.innerWidth;
                            }else{
                                stop = stop - box.innerLeft;
                            }

                            offset = graph.views[Object.keys(graph.views)[0]].offset;
                            currentWidth = box.innerWidth * offset.right - box.innerWidth * offset.left;
                            
                            graph.setPane(
                                ( box.innerWidth * offset.left + start / box.innerWidth * currentWidth ) / box.innerWidth,
                                ( box.innerWidth * offset.right - (box.innerWidth-stop) / box.innerWidth * currentWidth ) / box.innerWidth
                            );

                            graph.rerender();
                        }
                    }
                });
            },
            scope : {
                follow : '=vgraphFocus',
                stop : '=loseFocus'
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphHighlight',
    [
    function(){
        'use strict';

        return {
            require: ['^vgraphChart'],
            scope: true,
            link: function( $scope, el, attrs, requirements ){
                requirements[0].$on('highlight', function( point ){
                    $scope[ attrs.vgraphHighlight ] = point;
                    $scope.$digest();
                });
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphIcon',
    ['ComponentGenerator', 'StatCalculations', 'ComponentElement',
    function( ComponentGenerator, StatCalculations, ComponentElement ){
        'use strict';

        return {
            scope : {
                config: '=vgraphIcon'
            },
            require : ['^vgraphChart','vgraphIcon'],
            controller: ComponentElement,
            link : function( scope, $el, attrs, requirements ){
                var el = $el[0],
                	$d3 = d3.select( el ),
        			box = $d3.node().getBBox(),
        			chart = requirements[0],
                    cfg = chart.compileReference( scope.config ),
                    element = requirements[1],
                    content = el.innerHTML,
                    className = 'icon ',
                    oldParse = element.parse;

                element.parse = function( models ){
                    var t = oldParse.call( this, models ),
                        h = box.height / 2;
                    
                    t.min -= h;
                    t.max += h;

                    return t;
                };

                el.innerHTML = '';

                element.setElement( el );
                element.setDrawer(
                    ComponentGenerator.makeIconCalc( cfg, box, content )
                );
                element.setReferences([cfg]);

                if ( cfg.classExtend ){
                    className += cfg.classExtend + ' ';
                }

                className += attrs.className || cfg.className;

                el.setAttribute( 'class', className );

                cfg.$view.registerComponent(element);
            }
        };
    }]
);

/*
	function append(){
    	return this.appendChild( filling[i].cloneNode(true) ); // jshint ignore:line
    }

	el.html('');

	angular.forEach(points, function( d ){
		var ele;

		// TODO : how do I tell the box I am going to overflow it?
    	x = d.$sampled._$interval;
    	y = chart.y.scale( scope.getValue(d.$sampled) );

		ele = $el.append('g');
			
		for ( i = 0, c = filling.length; i < c; i++ ){
			ele.select( append );
		}
		
    	if ( attrs.showUnder ){
    		ele.attr( 'transform', 'translate(' + 
    			(x - box.width/2) + ',' + (y) + 
    		')' );
    	}else{
    		ele.attr( 'transform', 'translate(' + 
    			(x - box.width/2) + ',' + (y - box.height) + 
    		')' );
    	}
	});
*/
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

angular.module( 'vgraph' ).directive( 'vgraphInteract',
    [
    function(){
        'use strict';

        return {
            require : ['^vgraphChart'],
            scope : {
                dragPos : '=?dChange',
                dragStop : '=?dEnd',
                dragStart : '=?dBegin'
            },
            link : function( scope, el, attrs, requirements ){
                var graph = requirements[0],
                    dragging = false,
                    dragStart,
                    active,
                    box = graph.box,
                    $el = d3.select( el[0] ),
                    $rect = $el.append( 'rect' )
                        .style( 'opacity', '0' )
                        .attr( 'class', 'focal' )
                        .on( 'mousemove', function(){
                            var pos = d3.mouse(this);

                            if ( !dragging ){
                                clearTimeout( active );
                                graph.$trigger('focus',{
                                    x: pos[0],
                                    y: pos[1]
                                });
                            }
                        })
                        .on( 'mouseout', function(){
                            if ( !dragging ){
                                active = setTimeout(function(){
                                    graph.$trigger('focus', null);
                                }, 100);
                            }
                        });

                $el.attr( 'class', 'interactive' );

                $el.call(
                    d3.behavior.drag()
                    .on('dragstart', function(){
                        dragStart = d3.mouse( el[0] );
                        dragging = true;

                        graph.$trigger('focus', null);

                        scope.dragStart = {
                            x : dragStart[ 0 ],
                            y : dragStart[ 1 ]
                        };

                        scope.$apply();
                    })
                    .on('dragend', function(){
                        var res = d3.mouse( el[0] );

                        dragging = false;

                        scope.dragStop = {
                            x0 : dragStart[ 0 ],
                            y0 : dragStart[ 1 ],
                            x1 : res[ 0 ],
                            x2 : res[ 1 ],
                            xDiff : res[ 0 ] - dragStart[ 0 ],
                            yDiff : res[ 1 ] - dragStart[ 1 ]
                        };

                        scope.$apply();
                    })
                    .on('drag', function(){
                        var res = d3.mouse( el[0] );

                        scope.dragPos = {
                            x0 : dragStart[ 0 ],
                            y0 : dragStart[ 1 ],
                            x1 : res[ 0 ],
                            x2 : res[ 1 ],
                            xDiff : res[ 0 ] - dragStart[ 0 ],
                            yDiff : res[ 1 ] - dragStart[ 1 ]
                        };

                        scope.$apply();
                    })
                );

                $el.on('dblclick', function(){
                    graph.setPane(
                        {
                            'start' : null,
                            'stop' : null
                        },
                        {
                            'start' : null,
                            'stop' : null
                        }
                    );
                    
                    graph.rerender();
                });

                graph.registerComponent({
                    finalize : function(){
                        $rect.attr({
                            'x' : box.innerLeft,
                            'y' : box.innerTop,
                            'width' : box.innerWidth,
                            'height' : box.innerHeight
                        });
                    }
                });

                if ( !scope.dragStart ){
                    scope.dragStart = {};
                }

                if ( !scope.dragPos ){
                    scope.dragPos = {};
                }

                if ( !scope.dragStop ){
                    scope.dragStop = {};
                }
            }
        };
    }
]);



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
                var configs,
                    chart = requirements[0],
                    $el = d3.select( el[0] ),
                    elements;

                function parseConf( config ){
                    var cfg,
                        i, c;
                    
                    elements = {};

                    $el.selectAll( 'line' ).remove();

                    configs = [];
                    if ( config ){
                        for( i = 0, c = config.length; i < c; i++ ){
                            cfg = chart.getReference(config[i]);
                            configs.push( cfg );

                            elements[ cfg.name ] = $el.append('line').attr( 'class', 'line '+cfg.className );
                        }
                    }
                }

                function clearComponent(){
                    $el.attr( 'visibility', 'hidden' );
                }

                function drawComponent(){
                    var last,
                        isValid = true,
                        points = [];

                    angular.forEach( configs, function( cfg ){
                        var model = cfg.$view.normalizer,
                            datum = model.$getNode( model.$stats[cfg.field] ),
                            value = cfg.getValue(datum);

                        if ( datum && cfg.$view.isLeading() ){
                            points.push({
                                el : elements[cfg.name],
                                x : datum._$interval,
                                y : cfg.$view.y.scale( value )
                            });
                        }else{
                            elements[cfg.name].attr( 'visibility','hidden' );
                            isValid = false;
                        }
                    });

                    // sort the points form top to bottom
                    points.sort(function( a, b ){
                        return a.y - b.y;
                    });

                    angular.forEach( points, function( p ){
                        if ( last ){
                            last.el
                                .attr( 'visibility','visible' )
                                .attr( 'x1', last.x )
                                .attr( 'x2', p.x )
                                .attr( 'y1', last.y )
                                .attr( 'y2', p.y );
                        }

                        last = p;
                    });

                    if ( last && isValid ){
                        $el.attr( 'visibility', 'visible' );

                        last.el
                            .attr( 'visibility','visible' )
                            .attr( 'x1', last.x )
                            .attr( 'x2', last.x )
                            .attr( 'y1', last.y )
                            .attr( 'y2', chart.box.innerBottom );
                    }else{
                        clearComponent();
                    }
                }

                scope.$watchCollection('config', parseConf );

                scope.$on('$destroy',
                    chart.$subscribe({
                        'error': clearComponent,
                        'loading': clearComponent,
                        'success': drawComponent
                    })
                );
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphLine',
    ['ComponentGenerator', 'StatCalculations', 'ComponentElement',
    function( ComponentGenerator, StatCalculations, ComponentElement ){
        'use strict';

        return {
            scope: {
                config: '=vgraphLine',
                pair: '=?pair'
            },
            require : ['^vgraphChart','vgraphLine'],
            controller: ComponentElement,
            link : function( scope, $el, attrs, requirements ){
                var pair,
                    className,
                    el = $el[0],
                    chart = requirements[0],
                    cfg = chart.compileReference( scope.config ),
                    element = requirements[1];

                element.setElement( el );

                if ( attrs.pair ){ // pair is already a reference
                    pair = chart.compileReference( scope.pair );
                    className = 'fill ';
                    element.setDrawer(
                        ComponentGenerator.makeFillCalc( cfg, pair )
                    );
                    element.setReferences( [cfg,pair] );
                }else{
                    className = 'line ';
                    element.setDrawer(
                        ComponentGenerator.makeLineCalc( cfg )
                    );
                    element.setReferences( cfg );
                }

                if ( cfg.classExtend ){
                    className += cfg.classExtend + ' ';
                }

                className += attrs.className || cfg.className;

                el.setAttribute( 'class', className );

                cfg.$view.registerComponent(element);
            }
        };
    }]
);

angular.module( 'vgraph' ).directive( 'vgraphLoading',
    [ '$interval',
    function( $interval ){
        'use strict';
        
        return {
            require : ['^vgraphChart'],
            link : function( scope, el, attrs, requirements ){
                var unsubscribe,
                    graph = requirements[0],
                    pulsing = false,
                    interval,
                    box = graph.box,
                    text = attrs.vgraphLoading || 'Loading Data',
                    left,
                    width,
                    right,
                    $el = d3.select( el[0] )
                        .attr( 'class', 'loading-view' ),
                    $outline = $el.append( 'rect' )
                        .attr( 'height', 20 )
                        .attr( 'class', 'outline' ),
                    $filling = $el.append( 'rect' )
                        .attr( 'width', 0 )
                        .attr( 'height', 20 )
                        .attr( 'class', 'filling' ),
                    $text = $el.append( 'text' )
                        .text( text );

                function startPulse(){
                    if ( !pulsing && graph.loading ){
                        $el.attr( 'visibility', 'visible' );
                        pulsing = true;
                        $interval.cancel( interval );

                        pulse();
                        interval = $interval( pulse, 4005 );
                    }
                }

                function stopPulse(){
                    $el.attr( 'visibility', 'hidden' );

                    pulsing = false;
                    $interval.cancel( interval );
                }

                function pulse() {
                    $filling
                        .attr( 'x', function(){
                            return left;
                        })
                        .attr( 'width', function(){
                            return 0;
                        })
                        .transition()
                            .duration( 1000 )
                            .attr( 'x', function(){
                                return left;
                            })
                            .attr( 'width', function(){
                                return width;
                            })
                            .ease( 'sine' )
                        .transition()
                            .duration( 1000 )
                            .attr( 'width', 0 )
                            .attr( 'x', function(){
                                return right;
                            })
                            .ease( 'sine' )
                        .transition()
                            .duration( 1000 )
                            .attr( 'width', function(){
                                return width;
                            })
                            .attr( 'x', function(){
                                return left;
                            })
                            .ease( 'sine' )
                        .transition()
                            .duration( 1000 )
                            .attr( 'x', function(){
                                return left;
                            })
                            .attr( 'width', 0 )
                            .ease( 'sine' );
                }

                box.$on('resize',function(){
                    left = box.innerLeft + box.innerWidth / 5;
                    width = box.innerWidth * 3 / 5;
                    right = left + width;
                    
                    if ( width ){
                        $filling.attr( 'x', left )
                            .attr( 'y', box.middle - 10 );

                        $outline.attr( 'x', left )
                            .attr( 'y', box.middle - 10 )
                            .attr( 'width', width );

                        try {
                            $text.attr( 'text-anchor', 'middle' )
                                .attr( 'x', box.center )
                                .attr( 'y', box.middle + $text.node().getBBox().height / 2 - 2 );
                        }catch( ex ){
                            $text.attr( 'text-anchor', 'middle' )
                                .attr( 'x', box.center )
                                .attr( 'y', box.middle );
                        }

                        startPulse();
                    } else {
                        stopPulse();
                    }
                });

                startPulse();
                
                unsubscribe = graph.$subscribe({
                    'done': function(){
                        stopPulse();

                        if ( graph.loading && box.ratio ){
                            startPulse();
                        }
                    },
                    'error': stopPulse
                });

                scope.$on('$destroy', function(){
                    stopPulse();
                    unsubscribe();
                });
            }
        };
    } ]
);
angular.module( 'vgraph' ).directive( 'vgraphMessage',
    [
    function(){
        'use strict';

        return {
            require : ['^vgraphChart'],
            link : function( scope, el, attrs, requirements ){
                var unsubscribe,
                    graph = requirements[0],
                    box = graph.box,
                    $el = d3.select( el[0] )
                        .attr( 'class', 'error-view' ),
                    $outline = $el.append( 'rect' )
                        .attr( 'class', 'outline' ),
                    $text = $el.append( 'text' );

                $el.attr( 'visibility', 'hidden' );

                box.$on('resize',function(){
                    if ( box.innerHeight ){
                        $outline.attr( 'transform', 'translate('+box.innerLeft+','+box.innerTop+')' )
                            .attr( 'width', box.innerWidth )
                            .attr( 'height', box.innerHeight );
                        
                        try {
                            $text.attr( 'text-anchor', 'middle' )
                                .attr( 'x', box.center )
                                .attr( 'y', box.middle + $text.node().getBBox().height / 2 );
                        }catch( ex ){
                            $text.attr( 'text-anchor', 'middle' )
                                .attr( 'x', box.center )
                                .attr( 'y', box.middle );
                        }
                    }
                });

                unsubscribe = graph.$subscribe({
                    'error': function(){
                        var msg = graph.message;

                        if ( msg && !graph.loading ){
                            $el.attr( 'visibility', 'visible' );
                            $text.text( msg );
                        }
                    },
                    'done': function(){
                        $el.attr( 'visibility', 'hidden' );
                    }
                });
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphPage',
    ['ComponentPage',
    function( ComponentPage ){
        'use strict';

        return {
            restrict: 'A',
            scope : {
                settings : '=vgraphPage'
            },
            controller : ComponentPage,
            require : ['vgraphPage'],
            link: function ( $scope, $el, $attrs, requirements ){
                var page = requirements[0];

                $scope.$watch('settings', function( settings ){
                    page.configure( settings );
                });
            }
        };
    }]
);

angular.module( 'vgraph' ).directive( 'vgraphStack',
    [ '$compile', 'ComponentGenerator', 'StatCalculations', 'ComponentChart',
    function( $compile, ComponentGenerator, StatCalculations, ComponentChart ) {
        'use strict';

        return {
            require : ['^vgraphChart'],
            scope : {
                config: '=vgraphStack',
                feed: '=?feed'
            },
            link : function( scope, $el, attrs, requirements ){
                var configs,
                    viewName = attrs.view || ComponentChart.defaultView,
                    childTag = attrs.childTag,
                    graph = requirements[0],
                    view = graph.getView(viewName),
                    unwatch,
                    childScope;

                function pairElements( cfgs ){
                    var i, c,
                        cfg,
                        last = {};

                    configs = [];

                    for( i = 0, c = cfgs.length; i < c; i++ ){
                        cfg = graph.getReference( cfgs[i] );
                        cfg.pair = last;

                        last = cfg;

                        configs.push( cfg );
                    }
                }

                function parseConf( cfgs ){
                    var i, c,
                        lines,
                        elements;

                    if ( cfgs ){
                        pairElements( cfgs );

                        if ( childTag ){
                            d3.select( $el[0] ).selectAll( 'g' ).remove();

                            if ( childScope ){
                                childScope.$destroy();
                            }

                            lines = '';

                            for( i = 0, c = configs.length; i < c; i++ ){
                                lines += '<g '+childTag+'="config['+i+']"></g>';
                            }

                            elements = ComponentGenerator.svgCompile( lines );
                            
                            for( i = 0, c = elements.length; i < c; i++ ){
                                $el[0].appendChild( elements[i] );
                            }

                            childScope = scope.$new();
                            $compile( elements )( childScope );
                        }
                    }
                }

                scope.$watchCollection( 'config', parseConf );

                unwatch = scope.$watchCollection( 'config', parseConf );

                scope.$on('$destroy', function(){
                    childScope.$destroy();
                    unwatch();
                });

                view.registerComponent({
                    parse : function(){
                        if ( configs ){
                            StatCalculations.$resetCalcs( configs );
                            StatCalculations.stack( configs );
                        }
                    }
                });
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphStatus',
    [
    function(){
        'use strict';

        return {
            require: ['^vgraphChart'],
            scope: true,
            link: function( $scope, el, attrs, requirements ){
                var chart = requirements[0];

                function pushUpdate(){
                    $scope[ attrs.vgraphStatus ] = {
                        message: chart.message,
                        loading: chart.loading,
                        pristine: chart.pristine
                    };
                    $scope.$digest();
                }

                chart.$subscribe({
                    'done': pushUpdate,
                    'error': pushUpdate
                });
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphTarget',
    [
    function(){
        'use strict';

        return {
            require : ['^vgraphChart'],
            scope : {
                pointRadius: '=pointRadius',
                config: '=vgraphTarget'
            },
            link : function( $scope, el, attrs, requirements ){
                var configs,
                    graph = requirements[0],
                    box = graph.box,
                    $el = d3.select( el[0] )
                        .attr( 'class', 'target' ),
                    $highlight = $el.append( 'line' )
                        .attr( 'class', 'focus' )
                        .attr( 'x1', 0 )
                        .attr( 'x2', 0 ),
                    $dots = $el.append( 'g' ),
                    curX;

                function highlight( point ){
                    if ( point ){
                        curX = point.pos.x;

                        $el.style( 'visibility', 'visible' )
                                .attr( 'transform', 'translate(' + curX + ',0)' );

                        if ( attrs.noDots === undefined ){
                            angular.forEach( configs, function( cfg ){
                                var node,
                                    view = cfg.$view,
                                    datum = point[cfg.view],
                                    className = cfg.className,
                                    value = cfg.getValue(datum);
                                
                                if ( value !== undefined && value !== null ){
                                    node = $dots.selectAll( 'circle.point.'+className );
                                    if ( !node[0].length ){
                                        node = $dots.append( 'circle' )
                                            .attr( 'class', 'point '+className+' '+cfg.classExtend );
                                    }

                                    node.attr( 'cx', datum._$interval - curX )
                                        .attr( 'cy', view.y.scale(value) )
                                        .attr( 'r', $scope.$eval( attrs.pointRadius ) || 3 );
                                }else{
                                    $dots.selectAll( 'circle.point.'+className ).remove();
                                }
                            });
                        }
                    }else{
                        $el.style( 'visibility', 'hidden' );
                    }
                }

                $el.style( 'visibility', 'hidden' );
                graph.$on( 'highlight', highlight );

                box.$on('resize',function(){
                    $highlight.attr( 'y1', box.innerTop )
                        .attr( 'y2', box.innerBottom );
                });

                $scope.$watchCollection('config', function( cfgs ){
                    var i, c;

                    configs = [];

                    for( i = 0, c = cfgs.length; i < c; i++ ){
                        configs.push( graph.getReference(cfgs[i]) );
                    }
                });
            }
        };
    }]
);

angular.module( 'vgraph' ).directive( 'vgraphTooltip',
    [
    function(){
        'use strict';

        function makeConfig( graph, $scope, $attrs ){
            var cfg = $scope.config;

            if ( $attrs.reference ){
                return {
                    formatter: function( point ){
                        return point[$attrs.reference].value;
                    },
                    xParse: function( point ){
                        return point[$attrs.reference].x;
                    },
                    yParse: function( point ){
                        return point[$attrs.reference].y;
                    }
                };
            }else if ( !cfg.formatter ){
                return makeByConfig(graph,cfg);
            }else{
                return cfg;
            }
        }

        function makeByConfig( graph, cfg ){
            var ref = graph.getReference(cfg);

            return {
                formatter: function( point ){
                    return ref.getValue( point[ref.view] );
                },
                xParse: function( point ){
                    return point[ref.view]._$interval;
                },
                yParse: function( point ){
                    return ref.$view.y.scale( ref.getValue(point[ref.view]) );
                }
            };
        }

        return {
            require : ['^vgraphChart'],
            scope : {
                config: '=?vgraphTooltip'
            },
            /*
            config
            {
                ref {
                    view
                    model
                    field
                }
            }
            ------
            is string ===> reference
            ------
            {
                formatter
                xParse
                yParse
            }
            */
            link : function( scope, el, attrs, requirements ){
                var graph = requirements[0],
                    cfg = makeConfig( graph, scope, attrs ),
                    xOffset = parseInt(attrs.offsetX) || 0,
                    yOffset = parseInt(attrs.offsetY) || 0,
                    $el = d3.select( el[0] )
                        .attr( 'class', 'tooltip' ),
                    $polygon = $el.append( 'polygon' )
                        .attr( 'class', 'outline' )
                        .attr( 'transform', 'translate(0,-15)' ),
                    $text = $el.append( 'text' )
                        .style( 'line-height', '20' )
                        .style( 'font-size', '16' )
                        .attr( 'class', 'label' );

                graph.$on('highlight', function( point ){
                    var $y,
                        $x,
                        value,
                        width;

                    if ( point ){
                        value = cfg.yParse(point);
                    }

                    if ( value !== undefined ){
                        $y = value + yOffset;
                        $x = cfg.xParse(point) + xOffset;
                        $text.text( cfg.formatter(point) );
                        width = $text.node().getComputedTextLength() + 5; // magic padding... for luls

                        $el.style( 'visibility', 'visible' );

                        // go to the right or the left of the point of interest?
                        if ( $x + width + 16 < graph.box.innerRight ){
                            $el.attr( 'transform', 'translate('+$x+','+$y+')' );
                            $text.attr( 'transform', 'translate(10,5)' );
                            $polygon.attr( 'points', '0,15 10,0 '+( width + 10 )+',0 '+( width + 10 )+',30 10,30 0,15' );
                        }else{
                            $el.attr( 'transform', 'translate('+($x - xOffset * 2 - width - 10)+','+ $y +')' );
                            $text.attr( 'transform', 'translate(5,5)' );
                            $polygon.attr( 'points', '0,0 '+width+',0 '+( width+10 )+',15 '+width+',30 0,30 0,0' );
                        }
                    }else{
                        $el.style( 'visibility', 'hidden' );
                    }
                });
            }
        };
    } ]
);

angular.module( 'vgraph' ).directive( 'vgraphZoom',
    [
    function(){
        'use strict';

        return {
            scope : {
                min : '=zoomMin',
                max : '=zoomMax'
            },
            require : ['^vgraphChart','^vgraphPage'],
            link : function( scope, el, attrs, requirements ){
                var graph = requirements[0],
                    page = requirements[1],
                    box = graph.box,
                    target = page.getChart(attrs.vgraphZoom),
                    dragging = false,
                    zoomed = false,
                    dragStart,
                    minPos,
                    maxPos,
                    $el = d3.select( el[0] ),
                    $left = $el.append( 'g' )
                        .attr( 'class', 'left-control min-control' ),
                    $leftShade = $left.append( 'rect' )
                        .attr( 'class', 'shade' ),
                    $leftCtrl = $left.append( 'g' )
                        .attr( 'class', 'control' ),
                    $leftDrag,
                    $leftNub,
                    $focus = $el.append( 'rect' )
                        .attr( 'class', 'focus' ),
                    $right = $el.append( 'g' )
                        .attr( 'class', 'right-control max-control' ),
                    $rightShade = $right.append( 'rect' )
                        .attr( 'class', 'shade' ),
                    $rightCtrl = $right.append( 'g' )
                        .attr( 'class', 'control' ),
                    $rightDrag,
                    $rightNub;
                
                function redraw( noApply ){
                    if ( minPos === 0 && maxPos === box.innerWidth ){
                        zoomed = false;
                        $focus.attr( 'class', 'focus' );
                    }else{
                        zoomed = true;
                        $focus.attr( 'class', 'focus zoomed' );
                    }

                    if ( minPos < 0 ){
                        minPos = 0;
                    }

                    if ( maxPos > box.innerWidth ){
                        maxPos = box.innerWidth;
                    }

                    if ( minPos > maxPos ){
                        minPos = maxPos;
                    }else if ( maxPos < minPos ){
                        maxPos = minPos;
                    }

                    $left.attr( 'transform', 'translate(' + minPos + ',0)' );
                    $leftShade.attr( 'transform', 'translate(-' + minPos + ',0 )' )
                        .attr( 'width', minPos );

                    $right.attr( 'transform', 'translate(' +maxPos+ ',0)' );
                    $rightShade.attr( 'width', box.innerWidth - maxPos );

                    $focus.attr( 'transform', 'translate(' + minPos + ',0)' )
                        .attr( 'width', maxPos - minPos );

                    if ( !noApply ){
                        scope.$apply(function(){
                            target.setPane(
                                minPos / box.innerWidth,
                                maxPos / box.innerWidth
                            );

                            target.rerender();
                        });
                    }
                }

                $leftNub = $leftCtrl.append( 'path' )
                    .attr( 'd', 'M-0.5,23.33A6,6 0 0 0 -6.5,29.33V40.66A6,6 0 0 0 -0.5,46.66ZM-2.5,31.33V38.66M-4.5,31.33V38.66')
                    .attr('transform', 'translate(0,-9)') // to vertically center nub on mini-graph
                    .attr( 'class', 'nub' );

                $leftDrag = $leftCtrl.append( 'rect' )
                    .attr( 'width', '10' )
                    .attr( 'transform', 'translate(-10,0)' );

                $rightNub = $rightCtrl.append( 'path' )
                    .attr( 'd', 'M0.5,23.33A6,6 0 0 1 6.5,29.33V40.66A6,6 0 0 1 0.5,46.66ZM2.5,31.33V38.66M4.5,31.33V38.66')
                    .attr('transform', 'translate(0,-9)') // to vertically center nub on mini-graph
                    .attr( 'class', 'nub' );

                $rightDrag = $rightCtrl.append( 'rect' )
                    .attr( 'width', '10' );

                scope.box = box;

                $leftDrag.call(
                    d3.behavior.drag()
                    .on('dragstart', function(){
                        dragging = true;
                    })
                    .on('dragend', function(){
                        dragging = false;
                    })
                    .on('drag', function(){
                        minPos = d3.mouse( el[0] )[0];
                        redraw();
                    })
                );

                $rightDrag.call(
                    d3.behavior.drag()
                    .on('dragstart', function(){
                        dragging = true;
                    })
                    .on('dragend', function(){
                        dragging = false;
                    })
                    .on('drag', function(){
                        maxPos = d3.mouse( el[0] )[0];
                        redraw();
                    })
                );

                // the functionality of the focus element
                $focus.call(
                    d3.behavior.drag()
                    .on('dragstart', function(){
                        dragStart = {
                            mouse : d3.mouse( el[0] )[0],
                            minPos : minPos,
                            maxPos : maxPos
                        };
                        dragging = true;
                    })
                    .on('dragend', function(){
                        dragging = false;
                        zoomed = true;
                    })
                    .on('drag', function(){
                        var curr = d3.mouse( el[0] ),
                            dX = curr[0] - dragStart.mouse;

                        if ( zoomed ){
                            // this is zoomed mode, so it's a panning
                            maxPos = dragStart.maxPos + dX;
                            minPos = dragStart.minPos + dX;

                            redraw();
                        }else if ( dX > 1 ){
                            // I'm assuming 1 px zoom is way too small
                            // this is a zoom in on an area
                            maxPos = dragStart.mouse + Math.abs(dX);
                            minPos = dragStart.mouse - Math.abs(dX);

                            redraw();
                            zoomed = false;
                        }
                    })
                );

                $el.on('dblclick', function(){
                    maxPos = box.innerWidth;
                    minPos = 0;

                    redraw();
                });

                box.$on('resize',function(){
                    $el.attr( 'width', box.innerWidth )
                        .attr( 'height', box.innerHeight )
                        .attr( 'transform', 'translate(' +
                            box.innerLeft + ',' +
                            box.innerTop + ')'
                        );

                    $rightNub.attr('transform', 'translate(0,'+(box.innerHeight/2 - 30)+')');
                    $leftNub.attr('transform', 'translate(0,'+(box.innerHeight/2 - 30)+')');

                    $leftShade.attr( 'height', box.innerHeight );
                    $rightShade.attr( 'height', box.innerHeight );

                    $leftDrag.attr( 'height', box.innerHeight );
                    $rightDrag.attr( 'height', box.innerHeight );

                    $focus.attr( 'height', box.innerHeight );
                });

                target.$on('success', function( primaryView ){
                    if ( !dragging ){
                        if ( primaryView.offset ) {
                            minPos = primaryView.offset.left * box.innerWidth;
                            maxPos = primaryView.offset.right * box.innerWidth;
                        }else{
                            minPos = 0;
                            maxPos = box.innerWidth;
                        }

                        redraw( true );
                    }
                });
            }
        };
    } ]
);

(function( $ ){
    'use strict';

    var rnotwhite = (/\S+/g);
    var rclass = /[\t\r\n\f]/g;

    if ( $ ){
        $.fn.addClass = function( value ){
            var classes, elem, cur, clazz, j, finalValue,
                proceed = typeof value === 'string' && value,
                isSVG,
                i = 0,
                len = this.length;
            
            if ( $.isFunction( value ) ) {
                return this.each(function( j ) {
                    $( this ).addClass( value.call( this, j, this.className ) );
                });
            }
            
            if ( proceed ) {
                // The disjunction here is for better compressibility (see removeClass)
                classes = ( value || '' ).match( rnotwhite ) || [];
                for ( ; i < len; i++ ) {
                    elem = this[ i ];
                    isSVG = typeof( elem.className ) !== 'string';

                    cur = elem.nodeType === 1 && ( elem.className ?
                        ( ' ' + (isSVG ? (elem.getAttribute('class')||'') : elem.className ) + ' ' ).replace( rclass, ' ' ) :
                        ' '
                    );

                    if ( cur ) {
                        j = 0;
                        while ( (clazz = classes[j++]) ) {
                            if ( cur.indexOf( ' ' + clazz + ' ' ) < 0 ) {
                                cur += clazz + ' ';
                            }
                        }

                        // only assign if different to avoid unneeded rendering.
                        finalValue = $.trim( cur );
                        if ( elem.className !== finalValue ) {
                            if ( isSVG ){
                                elem.setAttribute( 'class', finalValue );
                            }else{
                                elem.className = finalValue;
                            }
                        }
                    }
                }
            }

            return this;
        };

        $.fn.removeClass = function( value ) {
            var classes, elem, cur, clazz, j, finalValue,
                proceed = arguments.length === 0 || typeof value === 'string' && value,
                isSVG,
                i = 0,
                len = this.length;

            if ( $.isFunction( value ) ) {
                return this.each(function( j ) {
                    $( this ).removeClass( value.call( this, j, this.className ) );
                });
            }
            if ( proceed ) {
                classes = ( value || '' ).match( rnotwhite ) || [];

                for ( ; i < len; i++ ) {
                    elem = this[ i ];
                    isSVG = typeof( elem.className ) !== 'string';
                    
                    // This expression is here for better compressibility (see addClass)
                    cur = elem.nodeType === 1 && ( elem.className ?
                        ( ' ' + (isSVG ? (elem.getAttribute('class')||'') : elem.className ) + ' ' ).replace( rclass, ' ' ) :
                        ''
                    );

                    if ( cur ) {
                        j = 0;
                        while ( (clazz = classes[j++]) ) {
                            // Remove *all* instances
                            while ( cur.indexOf( ' ' + clazz + ' ' ) >= 0 ) {
                                cur = cur.replace( ' ' + clazz + ' ', ' ' );
                            }
                        }

                        // only assign if different to avoid unneeded rendering.
                        finalValue = value ? $.trim( cur ) : '';
                        if ( elem.className !== finalValue ) {
                            if ( isSVG ){
                                elem.setAttribute( 'class', finalValue );
                            }else{
                                elem.className = finalValue;
                            }
                        }
                    }
                }
            }

            return this;
        };
    }
}( jQuery ));