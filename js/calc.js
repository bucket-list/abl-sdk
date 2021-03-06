angular.module('ablsdk').service('ablcalc', function($xabl, $timeout, p, debug){
  var sum;
  sum = function(arr){
    switch (false) {
    case typeof arr !== 'undefined':
      return 0;
    case typeof arr !== null:
      return 0;
    default:
      return p.sum(
      arr);
    }
  };
  return function(inputNewCharges, inputPrevousCharges, paid, operatorId){
    var prevousCharges, newCharges, ref$, makeNewCharge, byPrice, makeOldCharge, oldAmounts, exclude, availableAmounts, getAmounts, serviceFee, state, totalAdjustment, calcSubtotal, calcTaxFee, calcTaxesFees, showPrice, calcPrice, showAddonPrice, calcAddonPrice, totalAddons, calcCoupon, calcAgentCommission, warning, calcTotalWithoutCoupon, calcTotalWithoutService, calcServiceFee, calcTotalWithoutAgent, calcTotal, calcPreviousTotal, deposit, calcBalanceDue, adjustment, observers, onEvent, notify, coupon, agent, this$ = this;
    prevousCharges = inputPrevousCharges != null
      ? inputPrevousCharges
      : [];
    newCharges = (ref$ = inputNewCharges != null ? inputNewCharges.filter(function(it){
      return it.status === 'active';
    }) : void 8) != null
      ? ref$
      : [];
    makeNewCharge = function(charge){
      return {
        name: charge.name,
        isDefault: charge.isDefault,
        quantity: 0,
        amount: charge.amount,
        _id: charge._id
      };
    };
    byPrice = function(a, b){
      return b.amount - a.amount;
    };
    makeOldCharge = function(arr){
      var this$ = this;
      return {
        name: arr[0].name,
        isDefault: arr[0].isDefault,
        amount: arr[0].amount,
        quantity: arr.length,
        _ids: p.map(function(it){
          return it._id;
        })(
        arr)
      };
    };
    oldAmounts = function(type){
      var this$ = this;
      return p.sortWith(byPrice)(
      p.map(makeOldCharge)(
      p.map(function(it){
        return it[1];
      })(
      p.objToPairs(
      p.groupBy(function(it){
        return it.name + it.amount;
      })(
      p.filter(function(it){
        return it.type === type;
      })(
      prevousCharges))))));
    };
    exclude = curry$(function(type, charge){
      var old;
      old = p.find(function(it){
        return charge.name === it.name && charge.amount === it.amount;
      })(
      oldAmounts(type));
      if (old != null) {
        old.old = true;
      }
      return old == null;
    });
    availableAmounts = function(type){
      var this$ = this;
      return p.sortWith(byPrice)(
      p.filter(exclude(type))(
      p.map(makeNewCharge)(
      p.filter(function(it){
        return it.type === type;
      })(
      newCharges))));
    };
    getAmounts = function(type){
      var arr, isDefault, arr2, this$ = this;
      arr = p.sortBy(function(it){
        return it.amount;
      })(
      p.concat(
      p.map(function(it){
        return it(type);
      })(
      [oldAmounts, availableAmounts])));
      isDefault = p.filter(function(it){
        return it.isDefault;
      })(
      arr);
      arr2 = p.sortBy(function(it){
        return it.amount;
      })(
      p.filter(function(it){
        return isDefault.indexOf(it) === -1;
      })(
      arr));
      if (isDefault.length === 0) {
        return p.reverse(
        p.sortBy(function(it){
          return it.amount;
        })(
        arr));
      } else {
        return isDefault.concat(arr2);
      }
    };
    serviceFee = {
      amount: 3
    };
    state = {
      attendees: getAmounts('aap'),
      addons: getAmounts('addon')
    };
    totalAdjustment = function(){
      var this$ = this;
      return p.sum(
      p.map(function(it){
        return it.amount;
      })(
      adjustment.list));
    };
    calcSubtotal = function(){
      return sum(
      state.attendees.map(calcPrice)) + totalAdjustment() + totalAddons();
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
      newCharges.map(calcTaxFee));
    };
    showPrice = function(attendee){
      var ref$, ref1$, ref2$;
      return (ref$ = (ref1$ = newCharges.filter(function(it){
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
      var code, origin, ref$, percentage, currentPrice, result;
      code = coupon.codes[0];
      origin = Math.abs((ref$ = code != null ? code.amount : void 8) != null ? ref$ : 0);
      percentage = (ref$ = code != null ? code.percentage : void 8) != null ? ref$ : false;
      currentPrice = ((ref$ = code != null ? code.isTotal : void 8) != null ? ref$ : true)
        ? calcTotalWithoutCoupon()
        : calcSubtotal();
      result = (function(){
        switch (false) {
        case !(percentage === false && origin < currentPrice):
          return origin;
        case percentage !== false:
          return currentPrice;
        default:
          return currentPrice / 100 * origin;
        }
      }());
      return result * -1;
    };
    calcAgentCommission = function(opts){
      var code, originalExclusive, subtotal, additional, type, amount, totalAsSource;
      code = agent.codes[0];
      if (code == null) {
        return 0;
      }
      originalExclusive = code.settings.commission.originalExclusive;
      if (originalExclusive === false) {
        return 0;
      }
      subtotal = calcSubtotal();
      additional = calcTotalWithoutAgent(opts) - subtotal;
      type = code.settings.commission.type;
      amount = code.settings.commission.amount;
      totalAsSource = code.settings.commission.totalAsSource;
      if (type === 'percentage') {
        return (subtotal + additional * totalAsSource) * (amount / 100);
      } else {
        return amount;
      }
    };
    warning = function(charge, name){
      var removed, type, changed, res;
      removed = charge.status === 'inactive';
      type = charge.type;
      changed = charge.old;
      name = (function(){
        switch (false) {
        case type !== 'aap':
          return "pricing level";
        case type !== 'addon':
          return "add-on";
        }
      }());
      res = (function(){
        switch (false) {
        case !(removed && name === 'removed'):
          return "Warning: This " + name + " no longer exists. You can only reduce the quantity at this " + name + ". If you wish to offer another " + name + " at this price, please create on Adjustment to currect the price.";
        case !(changed && name === 'changed'):
          return "Warning: This " + name + " has changed since the booking was created. You can only reduce the quantity at this " + name + ". If you wish to offer the old " + name + ", please create an Adjustment.";
        case !((removed || changed) && name === 'mutated'):
          return true;
        default:
          return "";
        }
      }());
      return res;
    };
    calcTotalWithoutCoupon = function(){
      return calcSubtotal() + calcTaxesFees();
    };
    calcTotalWithoutService = function(){
      return calcTotalWithoutCoupon() + calcCoupon();
    };
    calcServiceFee = function(opts){
      return (calcTotalWithoutService() / 100) * (opts && opts.applicationFee !== null
        ? opts.applicationFee
        : serviceFee.amount);
    };
    calcTotalWithoutAgent = function(opts){
      return calcTotalWithoutService() + calcServiceFee(opts);
    };
    calcTotal = function(opts){
      return calcTotalWithoutAgent() + calcAgentCommission(opts);
    };
    calcPreviousTotal = function(){
      var this$ = this;
      return p.sum(
      p.map(function(it){
        return it.amount;
      })(
      prevousCharges));
    };
    deposit = p.sum(
    p.map(function(it){
      return it.amount;
    })(
    paid != null
      ? paid
      : []));
    calcBalanceDue = function(){
      return -(calcTotal() - deposit);
    };
    adjustment = {
      list: p.filter(function(it){
        return it.type === 'adjustment';
      })(
      prevousCharges),
      name: "",
      amount: "",
      isEdit: false,
      show: false,
      add: function(){
        var newItem;
        newItem = {
          name: adjustment.name,
          amount: adjustment.amount
        };
        newItem.amount *= 100;
        adjustment.list.push(newItem);
        adjustment.name = "";
        adjustment.amount = "";
        adjustment.show = false;
        return adjustment.isEdit = false;
      },
      removable: function(item){
        return item._id == null;
      },
      remove: function(item){
        var index;
        index = adjustment.list.indexOf(item);
        return adjustment.list.splice(index, 1);
      },
      edit: function(c){
        if (adjustment.isEdit) {
          adjustment.add();
        }
        adjustment.name = c.name;
        adjustment.amount = c.amount / 100;
        adjustment.show = true;
        adjustment.isEdit = true;
        return adjustment.remove(c);
      }
    };
    observers = {};
    onEvent = function(event, func){
      var ref$;
      observers[event] = (ref$ = observers[event]) != null
        ? ref$
        : [];
      return observers[event].push(func);
    };
    notify = function(event, data){
      var list, ref$;
      list = (ref$ = observers[event]) != null
        ? ref$
        : [];
      return p.each(function(it){
        return it(data);
      })(
      list);
    };
    coupon = {
      codes: p.filter(function(it){
        return it.type === 'coupon';
      })(
      prevousCharges),
      calc: calcCoupon,
      show: false,
      edit: function(c){
        coupon.code = c.code;
        coupon.remove(c);
        return coupon.show = true;
      },
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
        coupon.code = coupon.code.toUpperCase();
        coupon.error = (function(){
          switch (false) {
          case coupon.code.length !== 0:
            return "Code is required";
          case !(coupon.code.length < 6):
            return "6 chars are required";
          default:
            return "";
          }
        }());
        if (coupon.error.length > 0) {
          return;
        }
        apply = function(data){
          var success, startTime, redeemBy;
          success = function(){
            coupon.codes.push(data);
            notify('coupon-added', data);
            coupon.code = "";
            coupon.success = "Coupon " + data.couponId + " added successfully";
            coupon.show = false;
            $timeout(function(){
              var ref$;
              return ref$ = coupon.success, delete coupon.success, ref$;
            }, 3000);
            return "";
          };
          startTime = moment(data.startTime);
          redeemBy = moment(data.endTime);
          debug({
            startTime: startTime.format(),
            redeemBy: redeemBy.format(),
            check: startTime.diff(moment(), 'minutes'),
            check1: startTime.diff(redeemBy, 'minutes'),
            status: data.status,
            redemptions: data.maxRedemptions !== 0 && data.maxRedemptions <= data.redemptions,
            expired: moment().diff(redeemBy, 'minutes'),
            activity: data.activities.length > 0 && data.activities[0] !== activity
          });
          return coupon.error = (function(){
            switch (false) {
            case !(startTime.diff(moment(), 'minutes') > 0):
              return "Coupon is not valid yet";
            case data.status !== 'inactive':
              return "Coupon is inactive";
            case !(data.maxRedemptions !== 0 && data.maxRedemptions <= data.redemptions):
              return "This coupon has been fully redeemed.";
            case !(moment().diff(redeemBy, 'minutes') > 0):
              return "This coupon is expired";
            case !(data.activities.length > 0 && data.activities[0] !== activity):
              return "This coupon is not valid for this activity.";
            default:
              return success();
            }
          }());
        };
        return $xabl.get("coupons/" + coupon.code).success(function(data){
          return apply(data);
        }).error(function(data){
          var ref$, ref1$;
          coupon.error = (ref$ = data != null ? (ref1$ = data.errors) != null ? ref1$[0] : void 8 : void 8) != null ? ref$ : "Coupon not found";
          coupon.code = "";
          return coupon.show = true;
        });
      },
      code: ""
    };
    agent = {
      codes: p.filter(function(it){
        return it.type === 'agent_commission';
      })(
      prevousCharges),
      calc: calcAgentCommission,
      show: false,
      edit: function(c){
        agent.code = c.code;
        agent.remove(c);
        return agent.show = true;
      },
      remove: function(c){
        var index;
        index = agent.codes.indexOf(c);
        if (index > -1) {
          return agent.codes.splice(index, 1);
        }
      },
      add: function(activity){
        var ref$, apply, handleError;
        if (((ref$ = agent.code) != null ? ref$ : "").length === 0) {
          return;
        }
        agent.code = agent.code.toUpperCase();
        agent.error = (function(){
          switch (false) {
          case agent.code.length !== 0:
            return "Code is required";
          default:
            return "";
          }
        }());
        if (agent.error.length > 0) {
          return;
        }
        apply = function(data){
          agent.codes.push(data);
          notify('agent-added', data);
          agent.code = "";
          agent.success = "Agent code " + data.code + " added successfully";
          agent.show = false;
          $timeout(function(){
            var ref$;
            return ref$ = agent.success, delete agent.success, ref$;
          }, 3000);
          return "";
        };
        handleError = function(data){
          var ref$, ref1$;
          agent.error = (ref$ = data != null ? (ref1$ = data.errors) != null ? ref1$[0] : void 8 : void 8) != null ? ref$ : "Agent code not found";
          agent.code = "";
          return agent.show = true;
        };
        return $xabl.get("operators/" + operatorId + "/agents?partialMatch=false&code=" + agent.code).success(function(data){
          if (data.length === 1) {
            return apply(data[0]);
          } else {
            return handleError(data);
          }
        }).error(function(data){
          return handleError(data);
        });
      },
      code: ""
    };
    return {
      warning: warning,
      on: onEvent,
      handle: function($event){
        var ref$;
        debug('handle', $event);
        return coupon.code = ((ref$ = coupon.code) != null ? ref$ : "").toUpperCase();
      },
      handleAgent: function($event){
        var ref$;
        return agent.code = ((ref$ = agent.code) != null ? ref$ : "").toUpperCase();
      },
      coupon: coupon,
      agent: agent,
      calcServiceFee: calcServiceFee,
      adjustment: adjustment,
      addons: state.addons,
      attendees: state.attendees,
      showAttendees: function(){
        return p.join(", ")(
        p.map(function(o){
          return o.quantity + " " + o.name;
        })(
        p.filter(function(it){
          return it.quantity > 0;
        })(
        state.attendees)));
      },
      showAddons: function(){
        return p.join(", ")(
        p.map(function(o){
          return o.quantity + " " + o.name;
        })(
        p.filter(function(it){
          return it.quantity > 0;
        })(
        state.addons)));
      },
      totalWithoutTaxesfees: calcSubtotal,
      calcCoupon: calcCoupon,
      calcAgentCommission: calcAgentCommission,
      couponCode: function(){
        var code, ref$;
        code = coupon.codes[0];
        return (ref$ = code != null ? code.couponId : void 8) != null
          ? ref$
          : (ref$ = code != null ? code.name : void 8) != null ? ref$ : 'UNKNOWN';
      },
      calcTaxFee: calcTaxFee,
      setServiceFee: function(amount){
        return serviceFee.amount = amount;
      },
      calcTaxesFees: function(opts){
        return calcTaxesFees() + calcServiceFee(opts);
      },
      showPrice: showPrice,
      calcPrice: calcPrice,
      showAddonPrice: showAddonPrice,
      calcAddonPrice: calcAddonPrice,
      totalAddons: totalAddons,
      calcSubtotal: calcSubtotal,
      calcTotal: calcTotal,
      calcPreviousTotal: calcPreviousTotal,
      calcBalanceDue: calcBalanceDue
    };
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