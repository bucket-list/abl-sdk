// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk', []);
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk').service('ablapi', function($xabl){
    return {
      timeslots: function(options){
        var req;
        req = $.param({
          activity: options.activityId,
          dateRange: [moment(options.startTime).clone().startOf('day').startOf('month').toISOString(), moment(options.endTime).clone().startOf('day').endOf('month').endOf('day').toISOString()]
        });
        return $xabl.get("timeslots?" + req);
      }
    };
  });
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk').service('ablcalc', function($xabl){
    var sum;
    sum = function(arr){
      switch (false) {
      case typeof arr !== 'undefined':
        return 0;
      case typeof arr !== null:
        return 0;
      case arr.length !== 0:
        return 0;
      default:
        return arr.reduce(function(x, y){
          return x + y;
        });
      }
    };
    return function(charges){
      var makeEditable, byPrice, state, calcSubtotal, calcTaxFee, calcTaxesFees, showPrice, calcPrice, showAddonPrice, calcAddonPrice, totalAddons, calcCoupon, calcTotal, coupon;
      makeEditable = function(charge){
        var ref$;
        return {
          name: charge.name,
          quantity: (ref$ = charge.count) != null ? ref$ : 0,
          amount: charge.amount,
          _id: charge._id
        };
      };
      byPrice = function(a, b){
        return b.amount - a.amount;
      };
      state = {
        attendees: charges != null ? charges.filter(function(it){
          return it.type === 'aap';
        }).map(makeEditable).sort(byPrice) : void 8,
        addons: charges != null ? charges.filter(function(it){
          return it.type === 'addon';
        }).map(makeEditable) : void 8
      };
      calcSubtotal = function(){
        return sum(
        state.attendees.map(calcPrice)) + totalAddons();
      };
      calcTaxFee = function(charge){
        switch (false) {
        case charge.type !== 'tax':
          return calcSubtotal() / 100 * charge.amount;
        case charge.type !== 'fee':
          return sum(
          state.attendees.map(function(it){
            return it.quantity;
          })) * charge.amount;
        default:
          return 0;
        }
      };
      calcTaxesFees = function(){
        return sum(
        charges.map(calcTaxFee));
      };
      showPrice = function(attendee){
        var ref$, ref1$, ref2$;
        return (ref$ = (ref1$ = charges.filter(function(it){
          return it.type === 'aap' && it.name === attendee.name;
        })) != null ? (ref2$ = ref1$[0]) != null ? ref2$.amount : void 8 : void 8) != null ? ref$ : 0;
      };
      calcPrice = function(attendee){
        return showPrice(attendee) * attendee.quantity;
      };
      showAddonPrice = function(addon){
        return sum(
        state.addons.filter(function(it){
          return it.name === addon.name;
        }).map(function(it){
          return it.amount;
        }));
      };
      calcAddonPrice = function(addon){
        return showAddonPrice(addon) * addon.quantity;
      };
      totalAddons = function(){
        return sum(
        state.addons.map(calcAddonPrice));
      };
      calcCoupon = function(){
        var subtotal, amountOff, _;
        subtotal = calcSubtotal();
        amountOff = function(){
          switch (false) {
          case !(coupon.codes[0].amountOff < subtotal):
            return coupon.codes[0].amountOff;
          default:
            return subtotal;
          }
        };
        _ = (function(){
          switch (false) {
          case coupon.codes.length !== 0:
            return 0;
          case coupon.codes[0].amountOff == null:
            return amountOff();
          case coupon.codes[0].percentOff == null:
            return subtotal / 100 * coupon.codes[0].percentOff;
          default:
            return 0;
          }
        }());
        return _;
      };
      calcTotal = function(){
        return calcSubtotal() + calcTaxesFees() - calcCoupon();
      };
      coupon = {
        codes: [],
        calc: calcCoupon,
        remove: function(c){
          var index;
          index = coupon.codes.indexOf(c);
          if (index > -1) {
            return coupon.codes.splice(index, 1);
          }
        },
        add: function(activity){
          var ref$, apply;
          if (((ref$ = coupon.code) != null ? ref$ : "").length === 0) {
            return;
          }
          coupon.error = "";
          apply = function(data){
            var success;
            success = function(){
              coupon.codes.push(data);
              coupon.code = "";
              return "";
            };
            return coupon.error = (function(){
              switch (false) {
              case !(data.maxRedemptions !== 0 && data.maxRedemptions <= data.redemptions):
                return "This coupon has been fully redeemed.";
              case !(moment().diff(moment(data.redeemBy), 'minutes') > 0):
                return "This coupon is expired";
              case !(data.activities.length > 0 && data.activities[0] !== activity):
                return "This coupon is not valid for this activity.";
              default:
                return success();
              }
            }());
          };
          return $xabl.get("coupon/" + coupon.code).success(function(data){
            return apply(data);
          }).error(function(data){
            var ref$, ref1$;
            return coupon.error = (ref$ = data != null ? (ref1$ = data.errors) != null ? ref1$[0] : void 8 : void 8) != null ? ref$ : "Coupon not found";
          });
        },
        code: ""
      };
      return {
        coupon: coupon,
        addons: state.addons,
        attendees: state.attendees,
        totalWithoutTaxesfees: calcSubtotal,
        calcCoupon: calcCoupon,
        calcTaxFee: calcTaxFee,
        calcTaxesFees: calcTaxesFees,
        showPrice: showPrice,
        calcPrice: calcPrice,
        showAddonPrice: showAddonPrice,
        calcAddonPrice: calcAddonPrice,
        totalAddons: totalAddons,
        calcSubtotal: calcSubtotal,
        calcTotal: calcTotal
      };
    };
  });
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  var toString$ = {}.toString;
  angular.module('ablsdk').service('crud', function($xabl, $rootScope, debug, $mdDialog, safeApply, watcher){
    return function(url, initOptions){
      var parsedUrl, state, factory, provider, ref$, configureUrl, $scope, i, removeFromMemory, save, update, add, success, fetch, splice, remove, watchers, improve;
      parsedUrl = url.split('@');
      url = parsedUrl[0];
      state = {
        loading: false
      };
      factory = {
        localStorage: {
          remove: function(item){},
          add: function(item){},
          update: function(item){},
          fetch: function(item){}
        },
        memory: {
          remove: function(item){
            return removeFromMemory(item);
          },
          add: function(item, callback){
            Array.prototype.push.call(i, item);
            return typeof callback == 'function' ? callback(item) : void 8;
          },
          update: function(item, callback){
            return typeof callback == 'function' ? callback(item) : void 8;
          },
          fetch: function(){
            return state.loading = false;
          }
        },
        backend: {
          remove: function(item){
            return $xabl['delete'](url + "/" + item._id).success(function(){
              return removeFromMemory(item);
            });
          },
          update: function(item, callback){
            return $xabl.update(url + "/" + item._id, item).success(function(data){
              state.loading = false;
              return typeof callback == 'function' ? callback(data) : void 8;
            });
          },
          add: function(item, callback){
            return $xabl.create(url, item).success(function(data){
              debug('backend-success', data);
              success(data);
              return typeof callback == 'function' ? callback(data) : void 8;
            });
          },
          fetch: function(){
            return $xabl.get(configureUrl(url), i.options).success(function(data, status, headers){
              var params, r;
              i.length = 0;
              params = function(name){
                var header, parser;
                header = headers()[name];
                if (header != null) {
                  parser = document.createElement('a');
                  parser.href = headers()[name];
                  return JSON.parse('{"' + decodeURI(parser.search.substr(1, 2000)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
                } else {
                  return undefined;
                }
              };
              i.options.total = (r = params('x-last-page-url'), r != null
                ? parseInt(r.page) * parseInt(r.pageSize)
                : data.length);
              i.options.pageSize = (r = params('x-first-page-url'), r != null
                ? parseInt(r.pageSize)
                : data.length);
              state.loading = false;
              return success(data);
            });
          }
        }
      };
      provider = factory[(ref$ = parsedUrl[1]) != null ? ref$ : 'backend'];
      configureUrl = function(url){
        var name;
        for (name in i.urlOptions) {
          url = url.replace(':' + name, i.urlOptions[name]);
        }
        return url;
      };
      $scope = $rootScope.$new();
      $scope.items = [];
      i = $scope.items;
      state.loading = false;
      removeFromMemory = function(item){
        var index;
        index = i.indexOf(item);
        if (index > -1) {
          return Array.prototype.splice.call(i, index, 1);
        }
      };
      save = function(item, callback){
        if (item._id != null) {
          return update(item, callback);
        } else {
          return add(item, callback);
        }
      };
      update = function(item, callback){
        if (state.loading) {
          return;
        }
        return provider.update(item, callback);
      };
      add = function(item, callback){
        if (state.loading) {
          return;
        }
        return provider.add(item, callback);
      };
      success = function(data){
        var array;
        array = (function(){
          switch (false) {
          case toString$.call(data).slice(8, -1) !== 'Array':
            return data;
          case toString$.call(data[url]).slice(8, -1) !== 'Array':
            return data[url];
          case toString$.call(data).slice(8, -1) !== 'Object':
            return [data];
          default:
            return [];
          }
        }());
        Array.prototype.push.apply(i, array);
        return state.loading = false;
      };
      i.options = {};
      i.urlOptions = {};
      fetch = function(options){
        debug('fetch', state.loading);
        if (state.loading) {
          return;
        }
        switch (typeof options) {
        case 'Number':
          i.options.page = options;
          break;
        case 'Object':
          i.urlOptions = $.extend({}, typeof options.$url == 'function' ? options.$url({}, i.options.urlOptions) : void 8);
          delete options.$url;
          i.options = $.extend({}, options, i.options);
          i.page = 1;
        }
        state.loading = true;
        return provider.fetch();
      };
      fetch(initOptions);
      splice = function(){
        var removed;
        if (state.loading) {
          return;
        }
        removed = Array.prototype.splice.apply(i, arguments);
        return removed.forEach(provider.remove);
      };
      remove = function(item, $event, options){
        var defaultOptions, ref$;
        if (state.loading) {
          return;
        }
        defaultOptions = {
          title: "Deletion",
          content: "Are you that you want to delete this item?",
          ok: "Confirm",
          cancel: "Cancel"
        };
        return $mdDialog.show($mdDialog.confirm().title((ref$ = options != null ? options.title : void 8) != null
          ? ref$
          : defaultOptions.title).content((ref$ = options != null ? options.content : void 8) != null
          ? ref$
          : defaultOptions.content).ok((ref$ = options != null ? options.ok : void 8) != null
          ? ref$
          : defaultOptions.ok).cancel((ref$ = options != null ? options.cancel : void 8) != null
          ? ref$
          : defaultOptions.cancel).targetEvent($event)).then(function(){
          return provider.remove(item);
        }, function(){});
      };
      watchers = [];
      improve = function(source){
        var observers, bind;
        observers = [];
        bind = curry$(function(name, func){
          var bound, mutate;
          bound = [];
          improve(bound);
          mutate = function(){
            var mutated;
            mutated = Array.prototype[name].call(source, func);
            bound.length = 0;
            return Array.prototype.push.apply(bound, mutated);
          };
          observers.push(mutate);
          mutate();
          return bound;
        });
        source.loading = function(){
          return state.loading;
        };
        source.toArray = function(){
          var a;
          a = [];
          Array.prototype.push.apply(a, source);
          return a;
        };
        source.watch = function(array, $scope){
          var func;
          func = function(){
            return safeApply(function(){
              return observers.forEach(function(it){
                return it();
              });
            });
          };
          if ($scope != null) {
            watchers.push({
              array: $scope[array],
              func: func
            });
            $scope.$watch(array, func, true);
          } else {
            watchers.push({
              array: array,
              func: func
            });
            watcher.watch(array, func);
          }
          return source;
        };
        source.watch(source);
        ['map', 'filter'].forEach(function(item){
          return source[item] = bind(item);
        });
        source.push = add;
        source.save = save;
        source.fetch = fetch;
        source.remove = remove;
        source.splice = splice;
        return source.toArray = function(){
          return angular.copy(source);
        };
      };
      i.listen = function($scope){
        $scope.$on('$destroy', function(){
          var i$, ref$, len$, item, results$ = [];
          for (i$ = 0, len$ = (ref$ = watchers).length; i$ < len$; ++i$) {
            item = ref$[i$];
            results$.push(watcher.unwatch(item.array, item.func));
          }
          return results$;
        });
        return i;
      };
      improve(i);
      return i;
    };
  });
  function curry$(f, bound){
    var context,
    _curry = function(args) {
      return f.length > 1 ? function(){
        var params = args ? args.concat() : [];
        context = bound ? context || this : this;
        return params.push.apply(params, arguments) <
            f.length && arguments.length ?
          _curry.call(context, params) : f.apply(context, params);
      } : f;
    };
    return _curry();
  }
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk').service('abldate', function(debug){
    return function(timeZone){
      var hack, dst;
      hack = function(input, tz){
        var d, z;
        d = bind$(moment(input), 'format');
        z = bind$(tz, 'format');
        return moment(d('YYYY-MM-DD HH:mm ') + z('Z'), "YYYY-MM-DD HH:mm Z");
      };
      dst = function(d, date){
        return d.add(moment(date).tz(timeZone).utcOffset() - d.utcOffset(), 'minute');
      };
      return {
        backendify: function(date){
          var d;
          d = hack(date, moment().tz(timeZone)).tz(timeZone);
          debug('timezone', timeZone);
          dst(d);
          return d.tz("UTC").format("YYYY-MM-DD\\THH:mm:ss\\Z");
        },
        frontendify: function(date){
          var d;
          d = moment(date).tz(timeZone);
          debug('timezone', timeZone);
          dst(d, d);
          return hack(d, moment(date)).toDate();
        }
      };
    };
  });
  function bind$(obj, key, target){
    return function(){ return (target || obj)[key].apply(obj, arguments) };
  }
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  var toString$ = {}.toString;
  angular.module('ablsdk').factory('debug', function(enabledDebug){
    return function(input){
      var ref$;
      if (enabledDebug) {
        switch (toString$.call(input).slice(8, -1)) {
        case 'Function':
          return input();
        default:
          return typeof console != 'undefined' && console !== null ? (ref$ = console.log) != null ? ref$.apply(console, arguments) : void 8 : void 8;
        }
      }
    };
  });
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk').service('safeApply', function($rootScope){
    return function(fn){
      var phase;
      phase = $rootScope.$$phase;
      if (phase === '$apply' || phase === '$digest') {
        return fn();
      } else {
        return $rootScope.$apply(fn);
      }
    };
  });
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk').service('watcher', function($rootScope, browser, debug){
    var ugly, standard, r;
    ugly = function(){
      return {
        unwatch: function(array, func){
          return typeof func.unwatch == 'function' ? func.unwatch() : void 8;
        },
        watch: function(array, func){
          var $scope;
          $scope = $rootScope.$new();
          $scope.array = array;
          return func.unwatch = $scope.$watch('array', func, true);
        }
      };
    };
    standard = function(){
      return {
        unwatch: function(array, func){
          return Array.unobserve(array, func);
        },
        watch: function(array, callback){
          var createWatch, watch, ref$;
          createWatch = function(){
            var n;
            n = $rootScope.$new();
            return function(array, func){
              n.array = array;
              return n.$watch('array', func);
            };
          };
          watch = (ref$ = Array.observe) != null
            ? ref$
            : createWatch();
          return watch(array, callback);
        }
      };
    };
    debug(browser.name);
    r = (function(){
      switch (false) {
      case browser.name !== 'firefox':
        return ugly();
      case browser.name !== 'unknown':
        return ugly();
      case browser.name !== 'safari':
        return ugly();
      default:
        return ugly();
      }
    }());
    return r;
  });
}).call(this);
// Generated by LiveScript 1.3.1
(function(){
  angular.module('ablsdk').service('browser', function($window){
    var name;
    name = function(){
      var userAgent, browsers, key;
      userAgent = $window.navigator.userAgent;
      browsers = {
        chrome: /chrome/i,
        safari: /safari/i,
        firefox: /firefox/i,
        ie: /msie/i
      };
      for (key in browsers) {
        if (browsers[key].test($window.navigator.userAgent)) {
          return key;
        }
      }
      return 'unknown';
    };
    return {
      name: name()
    };
  });
}).call(this);
