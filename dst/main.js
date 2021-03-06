(function(){
  angular.module('ablsdk', []);
}).call(this);

angular.module('ablsdk').service('ablsdk', ["ablslot", "ablbook", "loader", "through", "p", "observ", "types", function(ablslot, ablbook, loader, through, p, observ, types){
  return observ(function(notify){
    var widget, chooseActivity;
    widget = {
      book: null,
      slot: null,
      calc: null,
      activities: [],
      currentActivity: null,
      preferences: null,
      choose: function(item){
        switch (false) {
        case !(item instanceof types.Day):
          return widget.slot.selectDay(item);
        case !(item instanceof types.Timeslot):
          return widget.slot.chooseSlot(item);
        case !(item instanceof types.Activity):
          return chooseActivity(item);
        default:
          throw "Type of object is not supported";
        }
      }
    };
    chooseActivity = function(item){
      widget.currentActivity = item;
      widget.book = ablbook(item, function(status, data){
        return notify(status, data);
      });
      widget.slot = ablslot(item, widget.book.calendar);
      widget.calc = function(){
        return widget.book.calendar.calc;
      };
      return widget.slot.observe(function(name){
        return notify(name);
      });
    };
    widget.load = function(config){
      return through(function(cb){
        return loader.activities({
          page: 0,
          location: ""
        }, function(scope){
          widget.activities.length = 0;
          p.each(bind$(widget.activities, 'push'))(
          scope.activities);
          widget.preferences = scope.preferences;
          return cb(scope);
        });
      });
    };
    return {
      widget: widget,
      destoy: function(){
        return widget.activities.length = 0;
      }
    };
  });
}]);
function bind$(obj, key, target){
  return function(){ return (target || obj)[key].apply(obj, arguments) };
}
angular.module('ablsdk').service('ablapi', ["$xabl", function($xabl){
  return {
    timeslots: function(options){
      var req;
      req = $.param({
        activity: options.activityId,
        "status[event]": 'all',
        dateRange: [moment(options.startTime).clone().startOf('day').startOf('month').toISOString(), moment(options.endTime).clone().startOf('day').endOf('month').endOf('day').toISOString()],
        pageSize: 100
      });
      return $xabl.get("timeslots?" + req);
    }
  };
}]);
angular.module('ablsdk').service('ablbook', ["$xabl", "p", "stripe", "debug", "prefill", "safeApply", function($xabl, p, stripe, debug, prefill, safeApply){
  return function(activity, globalCallback){
    var state, getDay, investigateDate, valid, issue, error, closeError, resetIdempotencyKey, few, sum, disabledOrder, cardify, cardify2, getEventInstanceId, bookingProcess, stripeProcess, paymentSetup, validate, bookingSuccess, checkout, agree, isError, showErrorLogical, showError, fields, patterns, messagePatterns, tryCheckout, message, placeholder, x$;
    state = {
      triedCheckout: false,
      typing: '',
      braintreeClient: null,
      loading: false,
      idempotencyKey: null,
      form: {
        error: "",
        agreed: false,
        email: '',
        name: '',
        phone: '',
        address: '',
        location: {},
        notes: '',
        date: {
          start: null,
          end: null
        },
        creditCard: {
          card: '',
          expDate: '',
          cvv: '',
          address_zip: ''
        }
      },
      calendar: {
        value: null,
        visible: false,
        currentActivity: activity,
        closed: function(chosen){
          debug('closed-calendar', chosen);
          state.form.date.start = state.calendar.date.start;
          state.form.date.end = state.calendar.date.end;
          return globalCallback('slot-chosen', chosen);
        }
      }
    };
    getDay = function(date){
      var res;
      if (date != null) {
        res = (date != null ? date.format : void 8) != null
          ? date
          : moment(date);
        return parseInt(
        res.format('YYYYMMDD'));
      } else {
        return null;
      }
    };
    investigateDate = function(bag){
      var _;
      return _ = (function(){
        switch (false) {
        case bag.start !== null:
          return 'none';
        case getDay(bag.start) === getDay(bag.end):
          return 'different';
        default:
          return 'same';
        }
      }());
    };
    valid = function(form){
      return !state.loading && form.$valid;
    };
    issue = function(form){
      var field, text;
      for (field in fields) {
        if (fields.hasOwnProperty(field)) {
          text = message(form, field);
          if ((text != null ? text.length : void 8) > 0) {
            return text;
          }
        }
      }
      return "Please check the form";
    };
    error = function(message){
      return state.form.error = message;
    };
    closeError = function(){
      return error("");
    };
    resetIdempotencyKey = function(){
      var s;
      return state.idempotencyKey = (s = function(){
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      }, s() + s() + '-' + s() + '-' + s() + '-' + s() + '-' + s() + s() + s());
    };
    resetIdempotencyKey();
    few = function(arr){
      var ref$;
      return (ref$ = arr != null ? typeof arr.filter == 'function' ? arr.filter(function(it){
        return it.quantity > 0;
      }) : void 8 : void 8) != null
        ? ref$
        : [];
    };
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
    disabledOrder = function(){
      return sum(state.calendar.calc.attendees.map(function(it){
        return it.quantity;
      })) === 0;
    };
    cardify = function(val, val2){
      var newval;
      newval = (function(){
        switch (false) {
        case val.length !== 4:
          return val + " ";
        case val.length !== 9:
          return val + " ";
        case val.length !== 14:
          return val + " ";
        case val.length !== 19:
          return val + " ";
        default:
          return val;
        }
      }());
      return newval + val2;
    };
    cardify2 = function(val, val2){
      var newval;
      newval = (function(){
        switch (false) {
        case val.length !== 4:
          return val + " ";
        case val.length !== 11:
          return val + " ";
        default:
          return val;
        }
      }());
      return newval + val2;
    };
    getEventInstanceId = function(){
      var eventId;
      if (state.calendar._id == null) {
        throw "Cannot get event instance id because calendar._id is not defined";
      }
      eventId = function(it){
        return it != null ? it.eventId : void 8;
      }(
      p.find(function(it){
        return it._id === state.calendar._id;
      })(
      activity.timeslots));
      if (eventId == null) {
        throw "event id is not found by id " + state.calendar._id + " in [" + activity.timeslots.map(function(it){
          return it._id;
        }).join(',') + "]";
      }
      return eventId + '_' + state.calendar.date.origin;
    };
    bookingProcess = function(token, callback){
      var f, a, makeNulls, coupon, agentCode, free, req, ref$;
      f = state.form;
      a = activity;
      makeNulls = function(total){
        return p.map(function(){
          return null;
        })(
        (function(){
          var i$, to$, results$ = [];
          for (i$ = 1, to$ = total; i$ <= to$; ++i$) {
            results$.push(i$);
          }
          return results$;
        }()));
      };
      coupon = state.calendar.calc.coupon.codes.length > 0;
      agentCode = state.calendar.calc.agent.codes.length > 0;
      free = state.calendar.calc.calcTotal() === 0;
      req = {
        isMobile: (ref$ = f.isMobile) != null ? ref$ : false,
        stripeToken: token,
        couponId: coupon ? state.calendar.calc.coupon.codes[0].couponId : undefined,
        paymentMethod: (function(){
          switch (false) {
          case !(free && coupon):
            return 'gift';
          case !free:
            return 'cash';
          default:
            return 'credit';
          }
        }()),
        agentCode: agentCode ? state.calendar.calc.agent.codes[0].code : undefined,
        eventInstanceId: getEventInstanceId(),
        addons: p.pairsToObj(
        p.map(function(a){
          return [a._id, makeNulls(a.quantity)];
        })(
        state.calendar.calc.addons)),
        attendees: p.pairsToObj(
        p.map(function(a){
          return [a._id, makeNulls(a.quantity)];
        })(
        state.calendar.calc.attendees)),
        answers: p.pairsToObj(
        p.map(function(a){
          return [a._id, a.answer];
        })(
        state.calendar.questions)),
        adjustments: state.calendar.calc.adjustment.list,
        fullName: f.name,
        email: f.email,
        phoneNumber: f.phone,
        notes: f.notes,
        location: f.location,
        currency: 'usd',
        operator: activity.operator._id || activity.operator,
        _customHeaders: {
          "Idempotency-Key": state.idempotencyKey
        }
      };
      return $xabl.post('bookings', req).success(function(data){
        var ref$, ref1$;
        if (data.bookingId != null) {
          f.bookingId = data.bookingId;
          resetIdempotencyKey();
          return callback(data);
        } else {
          return error((ref$ = (ref1$ = e.errors) != null ? ref1$[0] : void 8) != null ? ref$ : "Server error");
        }
      }).error(function(e){
        var ref$, ref1$;
        return error((ref$ = (ref1$ = e.errors) != null ? ref1$[0] : void 8) != null ? ref$ : "Server error");
      })['finally'](function(){
        return state.loading = false;
      });
    };
    stripeProcess = function(key, callback){
      var cc, expDate, f, req, ref$;
      if (typeof key === 'undefined') {
        state.loading = false;
        return error("Stripe key is not defined");
      }
      stripe.setPublishableKey(key);
      cc = state.form.creditCard;
      expDate = cc.expDate.split('/');
      f = state.form;
      req = {
        number: cc.card,
        cvc: cc.cvv,
        address_zip: cc.address_zip,
        exp_month: expDate[0],
        exp_year: "20" + expDate[1],
        fullName: (ref$ = f.fullName) != null
          ? ref$
          : f.name,
        location: f.location,
        state: f.state
      };
      return stripe.createToken(req, function(err, token){
        if (err != null) {
          state.loading = false;
          return error(err);
        }
        return bookingProcess(token, callback);
      });
    };
    paymentSetup = function(){
      return $xabl.get("payments/setup?operator=" + (activity.operator._id || activity.operator));
    };
    validate = function(form){
      var isValid;
      if (state.loading === true) {
        return false;
      }
      state.triedCheckout = true;
      isValid = valid(form);
      if (!isValid) {
        error(issue(form));
      }
      return isValid;
    };
    bookingSuccess = function(booking){
      state.booking = booking;
      return globalCallback('success', booking);
    };
    checkout = function(form, moreData){
      if (validate(form)) {
        state.loading = true;
        if (state.calendar.calc.calcTotal() > 0) {
          return paymentSetup().success(function(data){
            return stripeProcess(data.publicKey, bookingSuccess);
          }).error(function(err){
            state.loading = false;
            error(err);
            return globalCallback('error', error);
          });
        } else {
          return bookingProcess("", bookingSuccess);
        }
      }
    };
    agree = function(){
      state.form.agreed = !state.form.agreed;
      return tryCheckout();
    };
    isError = function(v){
      return v.required || v.pattern || v.minlength || v.maxlength || v.phone;
    };
    showErrorLogical = function(name, v){
      var s, show;
      s = fields[name].state;
      show = (function(){
        switch (false) {
        case !state.triedCheckout:
          return true;
        case !(!s.touched && !state.triedCheckout):
          return false;
        case !(s.active && !state.triedCheckout):
          return false;
        case !(!s.active && s.touched):
          return true;
        default:
          return false;
        }
      }());
      if (show) {
        return showError(name, v);
      } else {
        return "";
      }
    };
    showError = function(name, v){
      var ref$, ref1$, ref2$, ref3$, ref4$, ref5$;
      switch (false) {
      case !v.required:
        return (ref$ = (ref1$ = fields[name].messages) != null ? ref1$.required : void 8) != null
          ? ref$
          : fields[name].title + " is required";
      case !v.pattern:
        return (ref$ = (ref2$ = fields[name].messages) != null ? ref2$.pattern : void 8) != null
          ? ref$
          : "Please enter a valid " + fields[name].example;
      case !v.minlength:
        return (ref$ = (ref3$ = fields[name].messages) != null ? ref3$.minlength : void 8) != null
          ? ref$
          : fields[name].title + " is too short";
      case !v.maxlength:
        return (ref$ = (ref4$ = fields[name].messages) != null ? ref4$.maxlength : void 8) != null
          ? ref$
          : fields[name].title + " is too long";
      case !v.phone:
        return (ref$ = (ref5$ = fields[name].messages) != null ? ref5$.phone : void 8) != null
          ? ref$
          : fields[name].title + " is not valid phone number";
      default:
        return "please check " + fields[name].title;
      }
    };
    fields = {
      email: {
        title: "Email Address",
        pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
        example: 'nickname@email.com',
        placeholder: 'Email',
        state: {
          index: 1,
          touched: false,
          active: false
        }
      },
      name: {
        pattern: '',
        title: "Full Name",
        example: 'Your name',
        placeholder: 'Name',
        state: {
          index: 2,
          touched: false,
          active: false
        }
      },
      phone: {
        title: "Phone Number",
        pattern: /^[0-9]{3}[-][0-9]{3}[-][0-9]{3,5}$/i,
        placeholder: "Phone +1 123-456-1234",
        example: "+1 123-456-1234",
        state: {
          index: 3,
          touched: false,
          active: false
        }
      },
      address: {
        pattern: '',
        title: "Address",
        example: 'Address',
        placeholder: 'Home address',
        state: {
          index: 4,
          touched: false,
          active: false
        }
      },
      notes: {
        pattern: '',
        title: "Notes",
        example: "Notes",
        placeholder: "Notes",
        state: {
          index: 5,
          touched: false,
          active: false
        }
      },
      address_zip: {
        pattern: '',
        example: '12345',
        title: "Postal Code",
        placeholder: "Postal Code",
        normalize: function(value){
          return value;
        },
        state: {
          index: 6,
          touched: false,
          active: false
        }
      },
      card: {
        pattern: /(^[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}$)|(^[0-9]{4} [0-9]{6} [0-9]{5}$)/i,
        example: 'Card Number',
        title: "Credit Card Number",
        placeholder: "Credit Card Number",
        normalize: function(value){
          var stripValue, cvv, mask;
          if (typeof value === 'undefined') {
            return;
          }
          stripValue = value.split(' ').join('');
          if (stripValue.length < 15) {
            return;
          }
          cvv = function(number){
            fields.cvv.pattern = fields.cvv.patterns[number];
            return fields.cvv.messages.pattern = fields.cvv.messages.patterns[number];
          };
          mask = function(func){
            return state.form.creditCard.card = function(it){
              return it.substr(0, 19);
            }(
            p.fold(func, "")(
            stripValue));
          };
          debug('strip-value', stripValue.length, stripValue);
          if (stripValue.length === 15) {
            mask(cardify2);
            return cvv(4);
          } else if (stripValue.length === 16) {
            mask(cardify);
            return cvv(3);
          }
        },
        state: {
          index: 7,
          touched: false,
          active: false
        }
      },
      expDate: {
        pattern: /[0-9]{2}\/[0-9]{2}/i,
        example: "05/15",
        title: "Exp Date",
        placeholder: 'Exp Date (MM/YY)',
        normalize: function(value, keyCode){
          var e, ref$, t;
          e = (ref$ = value != null ? value.replace('/', '') : void 8) != null ? ref$ : "";
          t = function(it){
            return it != null ? it : "";
          };
          return state.form.creditCard.expDate = (function(){
            switch (false) {
            case !(e.length === 2 && keyCode === 8):
              return e[0] + e[1];
            case e.length !== 2:
              return e[0] + e[1] + '/';
            case !(e.length > 2):
              return e[0] + e[1] + '/' + t(e[2]) + t(e[3]);
            default:
              return e;
            }
          }());
        },
        state: {
          index: 8,
          touched: false,
          active: false
        }
      },
      startDate: {
        state: {
          index: 11,
          touched: false,
          active: false
        }
      },
      cvv: (patterns = {
        3: /^[0-9]{3}$/i,
        4: /^[0-9]{4}$/i
      }, messagePatterns = {
        3: "CVV must be 3 digits (e.g. 123)",
        4: "CVV must be 4 digits (e.g. 1234)"
      }, {
        pattern: patterns[3],
        patterns: patterns,
        example: "000",
        title: "CVV",
        placeholder: "CVV",
        state: {
          index: 9,
          touched: false,
          active: false
        },
        messages: {
          pattern: messagePatterns[3],
          patterns: messagePatterns
        }
      }),
      agreed: {
        title: "Confirmation",
        pattern: 'true',
        messages: {
          required: "Please accept the terms and conditions"
        },
        state: {
          index: 10,
          touched: false,
          active: false
        }
      }
    };
    tryCheckout = function(){
      if (state.form.agreed) {
        return state.triedCheckout = true;
      }
    };
    message = function(form, name){
      var sorted, field, val, ref$, this$ = this;
      sorted = p.pairsToObj(
      p.sortBy(function(it){
        return it[1].state.index;
      })(
      p.objToPairs(
      fields)));
      for (field in sorted) {
        if (fields.hasOwnProperty(field)) {
          val = (ref$ = form[field]) != null ? ref$.$error : void 8;
          if (val && isError(val)) {
            if (field === name) {
              return showErrorLogical(field, val);
            }
            return "";
          }
        }
      }
      return "";
    };
    placeholder = function(name){
      return fields[name].placeholder;
    };
    prefill(function(){
      var f, c;
      f = state.form;
      f.email = "a.stegno@gmail.com";
      f.name = "Test User";
      f.phone = "+380665243646";
      f.address = "664 Cypress Lane, Campbell, CA, United States";
      f.notes = "Some test notes";
      c = state.form.creditCard;
      c.card = "5105 1051 0510 5100";
      c.address_zip = "12345";
      c.expDate = "05/17";
      c.cvv = "333";
      return state.form.agreed = true;
    });
    x$ = state;
    x$.handle = function(event){
      return safeApply(function(){
        var name, type, value, field;
        name = event.target.name;
        type = event.type;
        value = event.target.value;
        field = fields[name];
        if (field == null) {
          return;
        }
        switch (type) {
        case 'keyup':
          return typeof field.normalize == 'function' ? field.normalize(value, event.keyCode) : void 8;
        case 'focus':
          field.state.active = true;
          return field.state.touched = true;
        case 'blur':
          return field.state.active = false;
        }
      });
    };
    x$.setIndex = function(name, index){
      var field;
      field = fields[name];
      if (field == null) {
        return index;
      }
      field.state.index = index;
      return index;
    };
    x$.investigateDate = investigateDate;
    x$.getEventInstanceId = getEventInstanceId;
    x$.placeholder = placeholder;
    x$.closeError = closeError;
    x$.checkout = checkout;
    x$.validate = validate;
    x$.agree = agree;
    x$.fields = fields;
    x$.few = few;
    x$.disabledOrder = disabledOrder;
    x$.message = message;
    return state;
  };
}]);
angular.module('ablsdk').service('browser', ["$window", function($window){
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
}]);
angular.module('ablsdk').service('ablcalc', ["$xabl", "$timeout", "p", "debug", function($xabl, $timeout, p, debug){
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
}]);
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
angular.module('ablsdk').filter('capitalize', function(){
  return function(input){
    if (angular.isString(input) && input.length > 0) {
      return input.charAt(0).toUpperCase() + input.substr(1).toLowerCase();
    } else {
      return input;
    }
  };
}).filter('capitalizeAll', function(){
  return function(input){
    if (angular.isString(input) && input.length > 0) {
      return input.split(' ').map(function(it){
        return it.charAt(0).toUpperCase() + it.substr(1).toLowerCase();
      }).join(' ');
    } else {
      return input;
    }
  };
});
var toString$ = {}.toString;
angular.module('ablsdk').service('crud', ["$xabl", "$rootScope", "debug", "$mdDialog", "safeApply", "watcher", "p", function($xabl, $rootScope, debug, $mdDialog, safeApply, watcher, p){
  return function(url, initOptions){
    var parsedUrl, state, factory, provider, ref$, configureUrl, $scope, i, removeFromMemory, save, update, add, success, fetch, splice, remove, watchers, improve;
    parsedUrl = url.split('@');
    url = parsedUrl[0];
    state = {
      loading: false,
      id: "_id",
      frontendify: function(data, url){
        var parts, part, array;
        parts = url.split('/');
        part = parts[parts.length - 1];
        return array = (function(){
          switch (false) {
          case toString$.call(data).slice(8, -1) !== 'Array':
            return data;
          case toString$.call(data.list).slice(8, -1) !== 'Array':
            return data.list;
          case toString$.call(data[part]).slice(8, -1) !== 'Array':
            return data[part];
          case toString$.call(data).slice(8, -1) !== 'Object':
            return [data];
          default:
            return [];
          }
        }());
      }
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
        remove: function(item, options){
          var ref$;
          return $xabl['delete'](((ref$ = options.url) != null ? ref$ : url) + "/" + item[state.id]).success(function(){
            var onItemRemovedDefault, onItemRemoved, ref$;
            onItemRemovedDefault = function(){
              return removeFromMemory(item);
            };
            onItemRemoved = (ref$ = options.onItemRemoved) != null ? ref$ : onItemRemovedDefault;
            return onItemRemoved();
          });
        },
        update: function(item, callback){
          return $xabl.update(url + "/" + item[state.id], item).success(function(data){
            state.loading = false;
            return typeof callback == 'function' ? callback(data) : void 8;
          });
        },
        add: function(item, callback){
          return $xabl.create(url, item).success(function(data){
            success(data);
            return typeof callback == 'function' ? callback(data) : void 8;
          });
        },
        fetch: function(){
          var options;
          options = angular.copy(
          i.options);
          delete options.total;
          delete options.$url;
          return $xabl.get(configureUrl(url), {
            params: options
          }).success(function(data, status, headers){
            var params, r;
            i.length = 0;
            params = function(name){
              var header, parser, err;
              header = headers()[name];
              if (header != null) {
                parser = document.createElement('a');
                parser.href = headers()[name];
                try {
                  return JSON.parse('{"' + decodeURI(parser.search.substr(1, 2000)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
                } catch (e$) {
                  err = e$;
                  console.error(err, parser.search);
                  return undefined;
                }
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
      var state, replace, u;
      state = {
        url: url
      };
      replace = function(pair){
        return state.url = state.url.replace(':' + pair[0], pair[1]);
      };
      u = i.getOptions().$url;
      if (u != null) {
        p.each(replace)(
        p.objToPairs(
        u));
      }
      return state.url;
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
      if (item[state.id] != null || item[state._id] != null) {
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
      var result, type, extendObject;
      result = state.frontendify(data, url);
      type = toString$.call(result).slice(8, -1);
      switch (type) {
      case 'Array':
        Array.prototype.push.apply(i, result);
        break;
      case 'Object':
        extendObject = function(pair){
          return i[pair[0]] = pair[1];
        };
        p.each(extendObject)(
        p.objToPairs(
        result));
      }
      return state.loading = false;
    };
    i.options = {};
    i.converter = function(converter){
      state.frontendify = converter.frontendify;
      state.backendify = converter.backendify;
      return i;
    };
    i.id = function(id){
      state.id = id;
      return i;
    };
    i.getOptions = function(){
      return i.options;
    };
    fetch = function(options){
      if (state.loading) {
        return;
      }
      switch (toString$.call(options).slice(8, -1)) {
      case 'Function':
        i.getOptions = options;
        return fetch({});
      case 'Number':
        i.options.page = options;
        break;
      case 'Object':
        i.options = angular.extend({}, i.getOptions(), options);
      }
      state.loading = true;
      if (i.options.page != null) {
        i.options.page -= 1;
      }
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
      var defaultOptions, confirm;
      if (state.loading) {
        return;
      }
      defaultOptions = {
        title: "Confirm Delete",
        content: "Deleting this pricing level will remove all prices associated with it in the timeslot section and on your booking widgets. This action cannot be undone, are you sure you want to delete this pricing level?",
        ok: 'Confirm',
        cancel: 'Cancel'
      };
      confirm = $mdDialog.confirm({
        controller: 'confirm2',
        templateUrl: 'confirm',
        locals: {
          options: angular.extend({}, defaultOptions, options)
        },
        targetEvent: $event
      });
      return $mdDialog.show(confirm).then(function(result){
        if (result === true) {
          return provider.remove(item, options);
        }
      });
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
      source.fetchOn = function(array, $scope){
        $scope.$watch(array, bind$(i, 'fetch'), true);
        return source;
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
}]);
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
function bind$(obj, key, target){
  return function(){ return (target || obj)[key].apply(obj, arguments) };
}
angular.module('ablsdk').filter('cut', function(){
  return function(value, trim){
    switch (false) {
    case typeof value !== 'undefined':
      return value;
    case value !== null:
      return value;
    case !(value.length - 3 > trim):
      return value.substr(0, trim) + '...';
    default:
      return value;
    }
  };
});
angular.module('ablsdk').service('abldate', ["debug", function(debug){
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
        dst(d);
        return d.tz("UTC").format("YYYY-MM-DD\\THH:mm:ss\\Z");
      },
      frontendify: function(date){
        var d;
        d = moment(date).tz(timeZone);
        dst(d, d);
        return hack(d, moment(date)).toDate();
      }
    };
  };
}]);
function bind$(obj, key, target){
  return function(){ return (target || obj)[key].apply(obj, arguments) };
}
var toString$ = {}.toString;
angular.module('ablsdk').factory('debug', ["enabledDebug", "$window", function(enabledDebug, $window){
  return function(input){
    var mtch, ref$;
    if (enabledDebug) {
      mtch = (function(){
        switch (false) {
        case toString$.call(input != null ? input.match : void 8).slice(8, -1) !== 'Function':
          return input.match(/<<[a-z]+>>/i);
        default:
          return null;
        }
      }());
      if (mtch && window['catch'] === mtch[0].replace('<<', '').replace('>>', '')) {
        debugger;
      } else {
        switch (toString$.call(input).slice(8, -1)) {
        case 'Function':
          return input();
        default:
          return typeof console != 'undefined' && console !== null ? (ref$ = console.log) != null ? ref$.apply(console, arguments) : void 8 : void 8;
        }
      }
    }
  };
}]);
angular.module('ablsdk').directive('event', ["p", "safeApply", function(p, safeApply){
  return {
    restrict: 'A',
    scope: {
      event: '&'
    },
    link: function($scope, element, $attrs){
      var $element, setup;
      $element = $(element);
      setup = function(eventName){
        return $element[eventName](function(event){
          var apply;
          apply = function(){
            return $scope.event({
              event: event
            });
          };
          return safeApply(apply, $scope);
        });
      };
      return p.each(setup)(
      ['blur', 'focus', 'keyup']);
    }
  };
}]);
angular.module('ablsdk').service('ablfacade', ["ablbook", "ablslot", function(ablbook, ablslot){
  return function(activity, callback){
    var book, slot;
    book = ablbook(activity, callback);
    slot = ablslot(activity, book.calendar);
    return {
      book: book,
      slot: slot
    };
  };
}]);
angular.module('ablsdk').service('formula', ["p", "debug", function(p, debug){
  var getSlotPrice, getVisualPrice;
  getSlotPrice = function(type, slot){
    var arr, ref$;
    arr = (ref$ = slot != null ? slot.charges : void 8) != null
      ? ref$
      : [];
    return function(it){
      var ref$;
      return (ref$ = it != null ? it.amount : void 8) != null ? ref$ : 0;
    }(
    p.find(function(it){
      return it.type === type || it.subtype === type || it.description === type;
    })(
    arr));
  };
  getVisualPrice = function(ac){
    var ref$, merge, onlyDefault, onlyAdult, all, mergedAdults, mergedAll, mergedDefault, max, min, final;
    if ((ac != null ? (ref$ = ac.timeslots) != null ? ref$.length : void 8 : void 8) > 0) {
      merge = function(arrays){
        return [].concat.apply([], arrays);
      };
      onlyDefault = function(slot){
        var ref$;
        return p.map(function(it){
          return it.amount;
        })(
        p.filter(function(it){
          return it.status === 'active';
        })(
        p.filter(function(it){
          return it.isDefault;
        })(
        (ref$ = slot != null ? slot.charges : void 8) != null
          ? ref$
          : [])));
      };
      onlyAdult = function(slot){
        var type, ref$;
        type = 'Adult';
        return p.map(function(it){
          return it.amount;
        })(
        p.filter(function(it){
          return it.status === 'active';
        })(
        p.filter(function(it){
          return it.type === type || it.subtype === type || it.description === type;
        })(
        (ref$ = slot != null ? slot.charges : void 8) != null
          ? ref$
          : [])));
      };
      all = function(slot){
        var ref$, this$ = this;
        return p.map(function(it){
          return it.amount;
        })(
        p.filter(function(it){
          return it.status === 'active';
        })(
        (ref$ = slot != null ? slot.charges : void 8) != null
          ? ref$
          : []));
      };
      mergedAdults = merge(ac.timeslots.map(onlyAdult));
      mergedAll = merge(ac.timeslots.map(all));
      mergedDefault = merge(ac.timeslots.map(onlyDefault));
      max = function(array){
        return Math.max.apply(Math, array);
      };
      min = function(array){
        return Math.min.apply(Math, array);
      };
      final = (function(){
        switch (false) {
        case !(mergedDefault.length > 0):
          return min(mergedDefault);
        case !(mergedAdults.length > 0):
          return max(mergedAdults);
        case !(mergedAll.length > 0):
          return max(mergedAll);
        default:
          return 0;
        }
      }());
      return final;
    } else {
      return 'Non';
    }
  };
  return {
    getSlotPrice: function(slot){
      return getSlotPrice('Adult', slot);
    },
    getVisualPrice: getVisualPrice,
    getAdultPrice: function(ac){
      var ref$;
      return getSlotPrice('Adult', ac != null ? (ref$ = ac.timeslots) != null ? ref$[0] : void 8 : void 8);
    },
    getYouthPrice: function(ac){
      var ref$;
      return getSlotPrice('Youth', ac != null ? (ref$ = ac.timeslots) != null ? ref$[0] : void 8 : void 8);
    }
  };
}]);
angular.module('ablsdk').directive('hint', ["$timeout", "debug", function($timeout, debug){
  return {
    restrict: 'A',
    replace: true,
    scope: {},
    link: function($scope, element, $attrs){
      var $element, state;
      $element = $(element);
      state = {
        hint: null
      };
      return $attrs.$observe('hint', function(value){
        $element.mouseover(function(){
          var offset, width, left;
          offset = $element.offset();
          width = 250;
          state.hint = $("<div>" + value + "</div>").css("position", "absolute").css("background", "gray").css("border-radius", "5px").css("width", width).css("box-sizing", "border-box").css("padding", "5px").css("text-align", "center").css("color", "white").css("z-index", "9999").css("opacity", "0").css("bottom", offset.bottom);
          state.hint.css("top", offset.top - state.hint.height() * 2);
          left = offset.left - width / 2;
          state.hint.css('left', Math.max(left, 0));
          state.hint.animate({
            opacity: 1
          }, 500);
          debug("mouseover", offset);
          return $(document.body).append(state.hint);
        });
        return $element.mouseout(function(){
          debug("mouseout");
          return state.hint.remove();
        });
      });
    }
  };
}]);
var toString$ = {}.toString;
angular.module('ablsdk').service('loader', ["$xabl", "types", "p", function($xabl, types, p){
  return {
    activities: function(options, callback){
      var config, ref$;
      config = $.param({
        location: (ref$ = options.location) != null ? ref$ : "",
        pageSize: 100,
        page: (ref$ = options.page) != null ? ref$ : 0,
        noEmpty: false,
        dateRange: [moment().startOf('day').format(), moment().clone().add(18, 'months').endOf('day').format()]
      });
      return $xabl.get("operators/" + $xabl.options.key).error(function(){
        throw "An error occurred getting Operator information for key " + $xabl.options.key;
      }).success(function(info){
        return $xabl.get("activities?" + config).success(function(resp){
          var this$ = this;
          if (toString$.call(resp.list).slice(8, -1) !== 'Array') {
            throw ".list is not Array";
          }
          if (toString$.call(resp.preferences).slice(8, -1) !== 'Object') {
            throw ".preferences is not Object";
          }
          return callback({
            activities: p.map(types.cast(function(it){
              return it.Activity;
            }))(
            resp.list),
            preferences: resp.preferences,
            info: info
          });
        });
      });
    }
  };
}]);
angular.module('ablsdk').directive('mdLongLabel', ["debug", function(debug){
  return {
    restrict: 'C',
    link: function($scope, $element){
      var label;
      label = $($element[0]).find('label');
      return setTimeout(function(){
        return $($element[0]).css('margin-top', (function(){
          switch (false) {
          case label.height() !== 0:
            return 0;
          case label.height() !== 20:
            return 0;
          default:
            return label.height();
          }
        }()));
      }, 100);
    }
  };
}]);
angular.module('ablsdk').filter('mdate', ["debug", function(debug){
  return function(obj, mask){
    switch (false) {
    case obj != null:
      return null;
    case obj.format == null:
      return obj.format(mask);
    default:
      return moment(obj).format(mask);
    }
  };
}]);
angular.module('ablsdk').service('observ', function(){
  return function(func){
    var observers, notify, scope;
    observers = [];
    notify = function(name, obj){
      var notify, this$ = this;
      notify = function(item){
        return item[1](obj);
      };
      return observers.filter(function(it){
        return it[0] === name;
      }).forEach(notify);
    };
    scope = func(notify);
    scope.on = function(name, callback){
      return observers.push([name, callback]);
    };
    scope.off = function(callback){
      var remove, this$ = this;
      remove = function(item){
        var index;
        index = observers.indexOf(item);
        return observers.splice(index, 1);
      };
      return observers.filter(function(it){
        return it[1] === callback;
      }).forEach(remove);
    };
    return scope;
  };
});
var toString$ = {}.toString;
angular.module('ablsdk').service('p', function(){
  var flatten, first, this$ = this;
  flatten = function(xs){
    var x;
    return [].concat.apply([], (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = xs).length; i$ < len$; ++i$) {
        x = ref$[i$];
        if (toString$.call(x).slice(8, -1) === 'Array') {
          results$.push(flatten(x));
        } else {
          results$.push(x);
        }
      }
      return results$;
    }()));
  };
  return {
    take: curry$(function(n, xs){
      if (n <= 0) {
        return xs.slice(0, 0);
      } else {
        return xs.slice(0, n);
      }
    }),
    drop: curry$(function(n, xs){
      if (n <= 0) {
        return xs;
      } else {
        return xs.slice(n);
      }
    }),
    head: first = function(xs){
      return xs[0];
    },
    each: curry$(function(f, xs){
      var i$, len$, x;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        f(x);
      }
      return xs;
    }),
    isItNaN: function(x){
      return x !== x;
    },
    all: curry$(function(f, xs){
      var i$, len$, x;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        if (!f(x)) {
          return false;
        }
      }
      return true;
    }),
    map: curry$(function(f, xs){
      return xs.map(f);
    }),
    fold: curry$(function(f, memo, xs){
      var i$, len$, x;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        memo = f(memo, x);
      }
      return memo;
    }),
    filter: curry$(function(f, xs){
      var i$, len$, x, results$ = [];
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        if (f(x)) {
          results$.push(x);
        }
      }
      return results$;
    }),
    find: curry$(function(f, xs){
      var i$, len$, x;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        if (f(x)) {
          return x;
        }
      }
    }),
    pairsToObj: function(object){
      var i$, len$, x, resultObj$ = {};
      for (i$ = 0, len$ = object.length; i$ < len$; ++i$) {
        x = object[i$];
        resultObj$[x[0]] = x[1];
      }
      return resultObj$;
    },
    objToPairs: function(object){
      var key, value, results$ = [];
      for (key in object) {
        value = object[key];
        results$.push([key, value]);
      }
      return results$;
    },
    values: function(object){
      var key, value, results$ = [];
      for (key in object) {
        value = object[key];
        results$.push(value);
      }
      return results$;
    },
    any: curry$(function(f, xs){
      var i$, len$, x;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        if (f(x)) {
          return true;
        }
      }
      return false;
    }),
    notAny: curry$(function(f, xs){
      var i$, len$, x;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        if (f(x)) {
          return false;
        }
      }
      return true;
    }),
    sum: function(xs){
      var result, i$, len$, x;
      result = 0;
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        result += x;
      }
      return result;
    },
    sort: function(xs){
      return xs.concat().sort(function(x, y){
        if (x > y) {
          return 1;
        } else if (x < y) {
          return -1;
        } else {
          return 0;
        }
      });
    },
    concat: function(xss){
      return [].concat.apply([], xss);
    },
    concatMap: curry$(function(f, xs){
      var x;
      return [].concat.apply([], (function(){
        var i$, ref$, len$, results$ = [];
        for (i$ = 0, len$ = (ref$ = xs).length; i$ < len$; ++i$) {
          x = ref$[i$];
          results$.push(f(x));
        }
        return results$;
      }()));
    }),
    flatten: flatten,
    groupBy: curry$(function(f, xs){
      var results, i$, len$, x, key;
      results = {};
      for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
        x = xs[i$];
        key = f(x);
        if (key in results) {
          results[key].push(x);
        } else {
          results[key] = [x];
        }
      }
      return results;
    }),
    sortWith: curry$(function(f, xs){
      return xs.concat().sort(f);
    }),
    sortBy: curry$(function(f, xs){
      return xs.concat().sort(function(x, y){
        if (f(x) > f(y)) {
          return 1;
        } else if (f(x) < f(y)) {
          return -1;
        } else {
          return 0;
        }
      });
    }),
    reverse: function(xs){
      return xs.concat().reverse();
    },
    split: curry$(function(sep, str){
      return str.split(sep);
    }),
    join: curry$(function(sep, xs){
      return xs.join(sep);
    }),
    lines: function(str){
      if (!str.length) {
        return [];
      }
      return str.split('\n');
    },
    unlines: function(it){
      return it.join('\n');
    },
    words: function(str){
      if (!str.length) {
        return [];
      }
      return str.split(/[ ]+/);
    },
    unwords: function(it){
      return it.join(' ');
    },
    chars: function(it){
      return it.split('');
    },
    unchars: function(it){
      return it.join('');
    },
    repeat: curry$(function(n, str){
      var result, i$;
      result = '';
      for (i$ = 0; i$ < n; ++i$) {
        result += str;
      }
      return result;
    }),
    maximum: function(xs){
      var max, i$, ref$, len$, x;
      max = xs[0];
      for (i$ = 0, len$ = (ref$ = xs.slice(1)).length; i$ < len$; ++i$) {
        x = ref$[i$];
        if (x > max) {
          max = x;
        }
      }
      return max;
    },
    minimum: function(xs){
      var min, i$, ref$, len$, x;
      min = xs[0];
      for (i$ = 0, len$ = (ref$ = xs.slice(1)).length; i$ < len$; ++i$) {
        x = ref$[i$];
        if (x < min) {
          min = x;
        }
      }
      return min;
    },
    maximumBy: curry$(function(f, xs){
      var max, i$, ref$, len$, x;
      max = xs[0];
      for (i$ = 0, len$ = (ref$ = xs.slice(1)).length; i$ < len$; ++i$) {
        x = ref$[i$];
        if (f(x) > f(max)) {
          max = x;
        }
      }
      return max;
    }),
    minimumBy: curry$(function(f, xs){
      var min, i$, ref$, len$, x;
      min = xs[0];
      for (i$ = 0, len$ = (ref$ = xs.slice(1)).length; i$ < len$; ++i$) {
        x = ref$[i$];
        if (f(x) < f(min)) {
          min = x;
        }
      }
      return min;
    }),
    capitalize: function(str){
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    camelize: function(it){
      return it.replace(/[-_]+(.)?/g, function(arg$, c){
        return (c != null ? c : '').toUpperCase();
      });
    },
    dasherize: function(str){
      return str.replace(/([^-A-Z])([A-Z]+)/g, function(arg$, lower, upper){
        return lower + "-" + (upper.length > 1
          ? upper
          : upper.toLowerCase());
      }).replace(/^([A-Z]+)/, function(arg$, upper){
        if (upper.length > 1) {
          return upper + "-";
        } else {
          return upper.toLowerCase();
        }
      });
    }
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
angular.module('ablsdk').factory('prefill', ["debug", "safeApply", function(debug, safeApply){
  return function(func){
    return;
    return debug(function(){
      return;
      return $.prefill = function(){
        var params, STRIP_COMMENTS, ARGUMENT_NAMES, getParams, requiredParams, i;
        params = Array.prototype.slice.call(arguments);
        STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        ARGUMENT_NAMES = /([^\s,]+)/g;
        getParams = function(func){
          var fnStr, result;
          fnStr = func.toString().replace(STRIP_COMMENTS, '');
          result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
          if (result === null) {
            return [];
          } else {
            return result;
          }
        };
        requiredParams = getParams(func);
        if (params.length === 0 && requiredParams.length > 0) {
          for (i in requiredParams) {
            params[i] = prompt("Put value for required " + i + " param");
          }
        }
        return safeApply(function(){
          return func.apply(null, params);
        });
      };
    });
  };
}]);
var toString$ = {}.toString;
angular.module('ablsdk').filter('price', ["$filter", function($filter){
  return function(amount, config){
    var view, r;
    view = (function(){
      switch (false) {
      case toString$.call(amount).slice(8, -1) !== 'String':
        return parseInt(amount) / 100;
      case toString$.call(amount).slice(8, -1) !== 'Number':
        return amount / 100;
      default:
        return "ERR";
      }
    }());
    if (view === 'ERR') {
      return view;
    }
    return r = (function(){
      switch (false) {
      case config !== '00.00$':
        return $filter('currency')(view).replace("$", '').trim() + "$";
      case config !== "$00":
        return '$' + Math.round(view);
      default:
        return $filter('currency')(view);
      }
    }());
  };
}]);
angular.module('ablsdk').service('safeApply', ["$rootScope", function($rootScope){
  return function(fn, $scope){
    var $current, phase;
    $current = $scope != null ? $scope : $rootScope;
    phase = $current.$$phase;
    if (phase === '$apply' || phase === '$digest') {
      return fn();
    } else {
      return $current.$apply(fn);
    }
  };
}]);
var toString$ = {}.toString;
angular.module('ablsdk').service('ablslot', ["abldate", "ablcalc", "ablapi", "formula", "p", "debug", "$xabl", "$rootScope", "types", function(abldate, ablcalc, ablapi, formula, p, debug, $xabl, $rootScope, types){
  return function(activity, inputModel, options){
    var transformCharge, getDay, newDate, generateCalendar, getMonth, hackDate, merge, makeAvailable, defineDateStart, performChooseSlot, actualEvent, isEmpty, transformSlot, slotsByDayWithoutFilters, slotsByDay, skipSlots, select, isFitToSlotFull, isFitToSlot, isNotFitToAnySlot, cutoff, inPast, isTooClose, createMonth, startMonth, _eventDate, _pairs, _dateTransform, _month, setCalendars, scroll, nextMonth, calendar, statusSlot, findChosenEvent, loadEvents, isDummy, isDisabledDay, selectDayAnyway, selectDay, notSelected, disabledSlot, notAvailableSlot, close, chooseSlot, chooseSlotAnyway, isActiveDay, isDisabledMonth, isActiveMonth, isCalendarUpDisabled, setMonth, calendarUp, calendarDown, setup, move, eventInstanceId, createEventInstanceId, model, slots, calendars, activeSlots, possibleSlots, x$, ref$, state, observer, dayHasBookableSlot, dayWithSlots;
    debug(function(){
      if (activity == null) {
        return console.warn("Activity is Not Defined for Ablslot ");
      }
    });
    transformCharge = function(item){
      return {
        _id: item._id,
        name: item.name,
        quantity: 0,
        amount: item.amount
      };
    };
    getDay = function(date){
      var res;
      if (date != null) {
        res = (date != null ? date.format : void 8) != null
          ? date
          : moment(date).tz(activity.timeZone);
        return parseInt(
        res.format('YYYYMMDD'));
      } else {
        return null;
      }
    };
    newDate = function(){
      var d;
      d = moment.apply(null, arguments);
      return d;
    };
    generateCalendar = function(date, callback){
      var d, year, month, toDate, lastDay, days, day, dummies, this$ = this;
      d = newDate(date);
      year = d.year();
      month = d.month();
      toDate = function(number){
        return newDate(moment.tz([year, month, number], activity.timeZone));
      };
      lastDay = d.endOf('month').date();
      days = p.map(types.cast(function(it){
        return it.Day;
      }))(
      p.map(toDate)(
      (function(){
        var i$, to$, results$ = [];
        for (i$ = 1, to$ = lastDay; i$ <= to$; ++i$) {
          results$.push(i$);
        }
        return results$;
      }())));
      day = newDate(days[0]).day();
      dummies = p.map(function(){
        return null;
      })(
      (function(){
        var i$, to$, results$ = [];
        for (i$ = 1, to$ = day; i$ <= to$; ++i$) {
          results$.push(i$);
        }
        return results$;
      }()));
      return {
        time: d,
        days: dummies.concat(days),
        headers: ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']
      };
    };
    getMonth = function(date){
      return Math.ceil(getDay(date) / 100);
    };
    hackDate = function(input, tz){
      var d, z;
      d = bind$(moment(input), 'format');
      z = bind$(tz, 'format');
      return moment(d('YYYY-MM-DD HH:mm ') + z('Z'), "YYYY-MM-DD HH:mm Z");
    };
    merge = function(date, time){
      var ndate, ntime;
      ndate = date != null
        ? date
        : hackDate(date, moment());
      ntime = time != null
        ? time
        : hackDate(time, moment());
      return moment([ndate.year(), ndate.month(), ndate.date(), ntime.hours(), ntime.minutes(), 0]);
    };
    makeAvailable = curry$(function(slot, arg){
      var correct, quantities, available, this$ = this;
      correct = function(val){
        var ref$, ref1$;
        switch (false) {
        case val !== null:
          return false;
        case typeof val !== 'undefined':
          return false;
        case toString$.call(val).slice(8, -1) !== 'Number':
          return true;
        case !(toString$.call(val).slice(8, -1) === 'String' && val.length === 0):
          return false;
        case !(toString$.call(val).slice(8, -1) === 'String' && ((ref$ = val.match('^[0-9]+$')) != null ? (ref1$ = ref$[0]) != null ? ref1$.length : void 8 : void 8) === val.length):
          return true;
        default:
          return false;
        }
      };
      quantities = p.filter(correct)(
      p.map(function(it){
        return it.quantity;
      })(
      model.calc.attendees));
      available = 'inactive' === slot.status
        ? 0
        : slot.available - eval(([0].concat(quantities)).join('+'));
      return available;
    });
    defineDateStart = function(day, slot){
      var merged;
      merged = merge(day, slot.startTime);
      return model.date.start = merged;
    };
    performChooseSlot = function(slot){
      var day, transform, ref$, timeslot, attendees, makeAttendee, this$ = this;
      debug('perform-choose-slot', slot);
      if (slot == null) {
        throw "Slot is undefined";
      }
      if (slot.available == null) {
        throw "Slot doesn't have required 'available' field";
      }
      day = model.value;
      defineDateStart(day, slot);
      transform = abldate(activity.timeZone);
      model.date.origin = transform.backendify(model.date.start).replace(/[\:-]/ig, '');
      model.date.end = slot.endTime;
      model.title = (ref$ = slot.title) != null
        ? ref$
        : activity.title;
      model.charges = slot.charges;
      model.calc = ablcalc(slot.charges.concat(activity.charges), null, null, activity.operator._id);
      if (slot._id == null) {
        throw "Slot doesn't have required field '_id'";
      }
      model._id = slot._id;
      debug("slots", slots);
      timeslot = p.find(function(it){
        return it._id === slot._id;
      })(
      slots);
      if (timeslot == null) {
        throw "Slot has not been found by id " + slot._id + " in [" + activity.timeslots.map(function(it){
          return it._id;
        }).join(',') + "]";
      }
      if ((timeslot != null ? timeslot.eventId : void 8) == null) {
        throw "Event id field has not been found in timeslot " + JSON.stringify(timeslot);
      }
      model.eventId = timeslot.eventId;
      attendees = model.attendees;
      makeAttendee = function(timeslot){
        var q;
        q = attendees.filter(function(it){
          return it.name === timeslot.name;
        });
        return {
          quantity: (function(){
            switch (false) {
            case !(q.length > 0):
              return q[0].quantity;
            case timeslot.name !== 'Adult':
              return 1;
            default:
              return 0;
            }
          }()),
          name: timeslot.name,
          amount: timeslot.amount
        };
      };
      model.attendees = slot.charges.filter(function(it){
        return it.type === 'aap';
      }).map(makeAttendee);
      return model.available = makeAvailable(slot);
    };
    actualEvent = curry$(function(day, event){
      return getDay(event.startTime) === getDay(day);
    });
    isEmpty = function(day){
      var this$ = this;
      return function(it){
        return it.length === 0;
      }(
      p.filter(isFitToSlot(day))(
      slots));
    };
    transformSlot = function(day){
      var actual;
      actual = actualEvent(day);
      return function(slot){
        var start, duration, event, maxOcc, title, available, ref$;
        start = merge(day, slot.startTime);
        duration = slot.endTime - slot.startTime;
        event = p.find(actual)(
        slot.events);
        maxOcc = null;
        title = event != null ? event.title : void 8;
        if (slot.events.length > 0 && event) {
          angular.forEach(slot.events, function(v, k){
            if (moment(v.startTime).format('YYYYMMDDHHmmss') === moment(start).format('YYYYMMDDHHmmss')) {
              maxOcc = v.maxOcc;
              title = v.title;
            }
          });
          if (maxOcc === null) {
            if (event) {
              maxOcc = event.maxOcc;
            } else {
              maxOcc = slot.maxOcc;
            }
          }
        } else {
          maxOcc = slot.maxOcc;
        }
        available = (ref$ = event != null ? event.available : void 8) != null
          ? ref$
          : maxOcc - (event ? event.attendees : 0);
        return {
          nativeSlot: slot,
          status: (ref$ = event != null ? event.status : void 8) != null
            ? ref$
            : slot.status,
          startTime: start,
          time: start.valueOf(),
          endTime: start.clone().add(duration, 'milliseconds'),
          charges: slot.charges,
          price: formula.getVisualPrice({
            timeslots: [slot]
          }),
          available: (event != null ? event.status : void 8) === 'inactive' ? 0 : available,
          title: title,
          _id: slot._id,
          duration: moment.duration(duration).format("M[M] d[d] h[h] m[m]").replace(/((^| )0[a-z])|[ ]/ig, ''),
          taken: maxOcc - available
        };
      };
    };
    slotsByDayWithoutFilters = function(day){
      var this$ = this;
      return p.sortBy(function(it){
        return it.time;
      })(
      p.map(types.cast(function(it){
        return it.Timeslot;
      }))(
      p.map(transformSlot(day))(
      p.filter(isFitToSlotFull(true, day))(
      slots))));
    };
    slotsByDay = function(day){
      var this$ = this;
      return p.sortBy(function(it){
        return it.time;
      })(
      p.map(types.cast(function(it){
        return it.Timeslot;
      }))(
      p.map(transformSlot(day))(
      p.filter(isFitToSlot(day))(
      slots))));
    };
    skipSlots = function(){
      var pref, ref$, ref1$, ref2$, ref3$, ref4$;
      pref = (ref$ = (ref1$ = $rootScope.user) != null ? (ref2$ = ref1$.preferences) != null ? (ref3$ = ref2$.widget) != null ? (ref4$ = ref3$.display) != null ? ref4$.timeslot : void 8 : void 8 : void 8 : void 8) != null
        ? ref$
        : {};
      return pref.availability + pref.startTime === 0 && activeSlots.length > 0;
    };
    select = function(day){
      model.value = day;
      activeSlots.length = 0;
      possibleSlots.length = 0;
      slotsByDayWithoutFilters(day).forEach(function(slot){
        return possibleSlots.push(slot);
      });
      slotsByDay(day).forEach(function(slot){
        if (slot.status === 'active') {
          return activeSlots.push(slot);
        }
      });
      if (skipSlots()) {
        return chooseSlot(activeSlots[0]);
      }
    };
    isFitToSlotFull = curry$(function(includePast, date, slot){
      var single, a, outOfActivityInterval, today, inPast, day, outOfWeek, check;
      single = slot.daysRunning.length === 0;
      a = activity;
      outOfActivityInterval = (function(){
        switch (false) {
        case !single:
          return getDay(slot.startTime) !== getDay(date);
        case !(getDay(slot.untilTime) < getDay(date)):
          return true;
        case !(getDay(slot.startTime) > getDay(date)):
          return true;
        default:
          return false;
        }
      }());
      today = merge(date, slot.startTime);
      inPast = today.diff(newDate(), 'minutes') - cutoff;
      day = function(date){
        var d, _;
        d = date != null ? typeof date.day == 'function' ? date.day() : void 8 : void 8;
        return _ = (function(){
          switch (false) {
          case d !== null:
            return null;
          case d !== 0:
            return 6;
          default:
            return d - 1;
          }
        }());
      };
      outOfWeek = !single && p.notAny(function(it){
        return it === day(date);
      })(
      slot.daysRunning);
      check = (function(){
        switch (false) {
        case !outOfWeek:
          return false;
        case !outOfActivityInterval:
          return false;
        case !(includePast === false && inPast <= 0):
          return false;
        default:
          return true;
        }
      }());
      return check;
    });
    isFitToSlot = isFitToSlotFull(false);
    isNotFitToAnySlot = function(date){
      switch (false) {
      case !p.notAny(function(it){
        return it.available > 0;
      })(
      slotsByDay(date)):
        return true;
      case !p.notAny(isFitToSlot(date))(
        slots):
        return true;
      default:
        return false;
      }
    };
    cutoff = (function(){
      var ref$, ref1$, ref2$, ref3$, ref4$, ref5$;
      switch (false) {
      case ((ref$ = $rootScope.user) != null ? (ref1$ = ref$.preferences) != null ? (ref2$ = ref1$.widget) != null ? (ref3$ = ref2$.display) != null ? (ref4$ = ref3$.event) != null ? ref4$.isSiteWide : void 8 : void 8 : void 8 : void 8 : void 8) !== true:
        return $rootScope.user.preferences.widget.display.event.cutoff;
      case !(((ref5$ = activity.cutoff) != null
          ? ref5$
          : -1) > -1):
        return activity.cutoff;
      default:
        return 48 * 60;
      }
    }());
    inPast = function(date, flags){
      if (flags != null && flags.indexOf('include_nearest') > -1) {
        return getDay(date) < getDay(newDate());
      } else {
        return getDay(date) < getDay(newDate());
      }
    };
    isTooClose = function(date){
      return date.isBefore(moment().add(cutoff, 'minute'));
    };
    createMonth = function(date){
      return newDate([date.year(), date.month(), 15]);
    };
    if (location.search.indexOf('event=') === -1) {
      startMonth = createMonth(newDate());
    } else {
      _eventDate = location.search.substr(location.search.indexOf('event=')).split('=');
      _pairs = _eventDate[1].split('_');
      _dateTransform = abldate(activity.timeZone);
      _month = moment(_dateTransform.frontendify(moment(_pairs[1], 'YYYYMMDDHHmmssZ').toDate()));
      startMonth = _month;
    }
    setCalendars = function(f, s, callback){
      calendars.length = 0;
      calendars.push(f);
      calendars.push(s);
      return loadEvents(callback);
    };
    scroll = {
      activeDate: function(){
        var start, up, get, isActive, scrollTo, active;
        scroll.activeDate = function(){};
        start = calendars[0];
        up = function(step){
          return generateCalendar(start.time.clone().add(step, 'month'));
        };
        get = function(step){
          if (step === 0) {
            return start;
          } else {
            return up(step);
          }
        };
        isActive = function(step){
          var func;
          func = (function(){
            switch (false) {
            case (options != null ? options.activeDayStrategy : void 8) !== 'dayHasBookableSlot':
              return dayHasBookableSlot;
            default:
              return isDisabledDay;
            }
          }());
          return typeof p.find(function(it){
            return !func(it);
          })(
          get(step).days) !== 'undefined';
        };
        scrollTo = function(i){
          return (function(){
            var i$, to$, results$ = [];
            for (i$ = 1, to$ = i; i$ <= to$; ++i$) {
              results$.push(i$);
            }
            return results$;
          }()).forEach(bind$(calendar, 'down'));
        };
        active = p.find(isActive)(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
        if (active > 0) {
          return scrollTo(active);
        }
      }
    };
    nextMonth = function(d, x){
      return date.clone().add(x, 'months');
    };
    calendar = {
      first: startMonth,
      second: startMonth.clone().add(12, 'month'),
      move: function(direction){
        calendar.first = calendar.first.clone().add(direction, 'month');
        calendar.second = calendar.second.clone().add(direction, 'month');
        return setCalendars(generateCalendar(calendar.first), generateCalendar(calendar.second));
      },
      down: function(){
        return calendar.move(1);
      },
      up: function(){
        return calendar.move(-1);
      }
    };
    statusSlot = null;
    findChosenEvent = function(){
      var ref$, pairs, id, dateTransform, day, slot, visualSlot, this$ = this;
      debug('find-chosen-event');
      if (((ref$ = state.chosenEvent) != null ? ref$ : "").length === 0) {
        return;
      }
      if (slots.length === 0) {
        return;
      }
      pairs = state.chosenEvent.split('_');
      id = pairs[0];
      dateTransform = abldate(activity.timeZone);
      day = moment(dateTransform.frontendify(moment(pairs[1], 'YYYYMMDDHHmmssZ').toDate()));
      slot = p.find(function(it){
        return it.eventId === id;
      })(
      slots);
      if (slot != null) {
        if (inPast(day)) {
          statusSlot = 'not-found';
          return observer.notify('event-not-found');
        }
        if (isTooClose(day)) {
          statusSlot = 'too-close';
          return observer.notify('event-too-close');
        }
        if (!isDisabledDay(day)) {
          selectDay(day);
          slot = p.find(function(it){
            return it._id === slot._id;
          })(
          activeSlots);
          debug('slot', slot);
          if (slot != null) {
            debug('choose-slot', slot);
            if (notAvailableSlot(slot)) {
              debug('not-available', slot);
              return observer.notify('event-sold-out');
            } else {
              debug('available', slot);
              return chooseSlot(
              slot);
            }
          } else {
            debug('event-not-found');
            return observer.notify('event-not-found');
          }
        } else {
          visualSlot = p.find(function(it){
            return it._id === slot._id;
          })(
          slotsByDay(day));
          if (slot == null) {
            return observer.notify('event-not-found');
          }
          if (notAvailableSlot(visualSlot)) {
            statusSlot = 'sold-out';
            return observer.notify('event-sold-out');
          } else {
            return observer.notify('event-not-found');
          }
        }
      } else {
        return observer.notify('event-not-found');
      }
    };
    loadEvents = function(callback){
      slots.length = 0;
      return ablapi.timeslots({
        startTime: calendars[0].time,
        endTime: calendars[1].time,
        activityId: activity._id
      }).success(function(loadedSlots){
        var transform, comp, transformDate;
        transform = abldate(activity.timeZone);
        comp = compose$(transform.frontendify, moment);
        transformDate = function(slot){
          slot.startTime = comp(slot.startTime);
          slot.endTime = comp(slot.endTime);
          slot.untilTime = comp(slot.untilTime);
          return slot;
        };
        slots.length = 0;
        if (loadedSlots.length === 0) {
          debug('event-not-found');
          observer.notify('event-not-found');
        } else {
          loadedSlots.list.map(transformDate).forEach(function(item){
            debug('add-slot');
            return slots.push(item);
          });
        }
        if (statusSlot !== 'sold-out') {
          findChosenEvent();
        }
        scroll.activeDate();
        observer.notify('load-slot-list-complete');
        return typeof callback == 'function' ? callback() : void 8;
      }).error(function(){
        return observer.notify('event-not-found');
      });
    };
    isDummy = function(date){
      switch (false) {
      case date !== null:
        return true;
      default:
        return false;
      }
    };
    isDisabledDay = function(date, flags){
      switch (false) {
      case !isDummy(date):
        return true;
      case !isEmpty(date):
        return true;
      case !inPast(date, flags):
        return true;
      case !isNotFitToAnySlot(date):
        return true;
      default:
        return false;
      }
    };
    selectDayAnyway = function(day){
      select(day);
      return defineDateStart(day, slots[0]);
    };
    selectDay = function(day){
      if (isDisabledDay(day)) {
        return;
      }
      return selectDayAnyway(day);
    };
    notSelected = function(){
      switch (false) {
      case model.date.start !== null:
        return true;
      case model.chosen !== false:
        return true;
      default:
        return false;
      }
    };
    disabledSlot = function(slot){
      switch (false) {
      case slot != null:
        return "Event Not Found";
      case slot.available !== 0:
        return "This event is full";
      default:
        return "";
      }
    };
    notAvailableSlot = function(slot){
      return slot == null || slot.available <= 0;
    };
    close = function(chosen){
      var setDefault;
      setDefault = function(attendee){
        if (attendee.quantity === 0 && attendee.name === 'Adult') {
          return attendee.quantity = 1;
        }
      };
      model.attendees.forEach(setDefault);
      model.chosen = chosen;
      model.visible = false;
      return typeof model.closed == 'function' ? model.closed(chosen) : void 8;
    };
    chooseSlot = function(slot){
      if (notAvailableSlot(slot)) {
        return;
      }
      performChooseSlot(slot);
      return close(true);
    };
    chooseSlotAnyway = function(slot){
      performChooseSlot(slot);
      return close(true);
    };
    isActiveDay = function(date){
      return getDay(date) === getDay(model.value);
    };
    isDisabledMonth = function(date){
      switch (false) {
      case !(getDay(date) < getDay(newDate())):
        return true;
      default:
        return false;
      }
    };
    isActiveMonth = function(date){
      return getMonth(date) === getMonth(model.value);
    };
    isCalendarUpDisabled = function(){
      return getMonth(calendars[0].time) < getMonth(newDate());
    };
    setMonth = function(date, max){
      var iter, current, desired;
      iter = max != null ? max : 99;
      iter = iter - 1;
      if (iter < 0) {
        return;
      }
      current = getMonth(calendars[0].time);
      desired = getMonth(date);
      debug('set-month', current, desired);
      if (current > desired) {
        calendar.up();
        return setMonth(date, iter);
      } else if (current < desired) {
        calendar.down();
        return setMonth(date, iter);
      }
    };
    calendarUp = function(){
      if (isCalendarUpDisabled()) {
        return;
      }
      return calendar.up();
    };
    calendarDown = function(){
      return calendar.down();
    };
    setup = function(){
      return setCalendars(generateCalendar(startMonth.clone()), generateCalendar(startMonth.clone().add(12, 'month')), function(){
        return selectDay(model.value);
      });
    };
    move = function(bookingId){
      return $xabl.put("bookings/" + bookingId + "/move", {
        eventInstanceId: createEventInstanceId()
      });
    };
    eventInstanceId = function(model){
      var transform;
      transform = abldate(activity.timeZone);
      return model.eventId + '_' + transform.backendify(model.date.start).replace(/[\:-]/ig, '');
    };
    createEventInstanceId = function(){
      return eventInstanceId(model);
    };
    model = inputModel != null
      ? inputModel
      : {};
    slots = [];
    calendars = [];
    activeSlots = [];
    possibleSlots = [];
    x$ = model;
    x$.date = {
      start: null,
      end: null
    };
    x$.value = null;
    x$.eventId = null;
    x$._id = null;
    x$.charges = [];
    x$.attendees = [];
    x$.addons = activity.charges.filter(function(it){
      return it.type === 'addon';
    }).map(transformCharge);
    x$.questions = (ref$ = activity.questions) != null
      ? ref$
      : [];
    x$.bg = activity.image;
    setup();
    state = {
      chosenEvent: null
    };
    observer = {
      list: [],
      observe: function(func){
        return observer.list.push(func);
      },
      notify: function(name, data){
        return p.each(function(watch){
          return watch(name, data);
        })(
        observer.list);
      }
    };
    dayHasBookableSlot = function(day){
      return slotsByDayWithoutFilters(day).length > 0;
    };
    dayWithSlots = function(day){
      return slotsByDayWithoutFilters(day);
    };
    return {
      observe: observer.observe,
      chooseEvent: function(id){
        state.chosenEvent = id;
        return findChosenEvent();
      },
      isChosenEvent: function(){
        var ref$;
        return ((ref$ = state.chosenEvent) != null ? ref$ : "").length > 0;
      },
      setMonth: setMonth,
      model: model,
      activeSlots: activeSlots,
      possibleSlots: possibleSlots,
      move: move,
      selectDay: selectDay,
      selectDayAnyway: selectDayAnyway,
      calendars: calendars,
      createEventInstanceId: createEventInstanceId,
      calendarUp: calendarUp,
      calendarDown: calendarDown,
      close: close,
      isActiveMonth: isActiveMonth,
      isDisabledDay: isDisabledDay,
      dayHasBookableSlot: dayHasBookableSlot,
      dayWithSlots: dayWithSlots,
      isDisabledMonth: isDisabledMonth,
      isCalendarUpDisabled: isCalendarUpDisabled,
      isDummy: isDummy,
      isActiveDay: isActiveDay,
      notSelected: notSelected,
      chooseSlot: chooseSlot,
      chooseSlotAnyway: chooseSlotAnyway,
      notAvailableSlot: notAvailableSlot,
      disabledSlot: disabledSlot,
      skipSlots: skipSlots
    };
  };
}]);
function bind$(obj, key, target){
  return function(){ return (target || obj)[key].apply(obj, arguments) };
}
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
function compose$() {
  var functions = arguments;
  return function() {
    var i, result;
    result = functions[0].apply(this, arguments);
    for (i = 1; i < functions.length; ++i) {
      result = functions[i](result);
    }
    return result;
  };
}
angular.module('ablsdk').factory('stripe', ["$rootScope", "safeApply", function($rootScope, safeApply){
  var model, init;
  model = {};
  init = function(){
    var c;
    model.setPublishableKey = Stripe.setPublishableKey;
    c = Stripe.card;
    return model.createToken = function(card, callback){
      var ref$, ref1$, ref2$, ref3$;
      if (!c.validateCardNumber(card.number)) {
        return callback('Card number is not correct');
      }
      if (!c.validateExpiry(card.exp_month, card.exp_year)) {
        return callback('Expiration Month/Year is not correct');
      }
      if (!c.validateCVC(card.cvc)) {
        return callback('CVV is not correct. Your CVV number can be located by looking on your credit or debit card');
      }
      return c.createToken({
        number: card.number,
        cvc: card.cvc,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        name: card.fullName,
        address_line1: (ref$ = card.location) != null ? ref$.street_address : void 8,
        address_city: (ref1$ = card.location) != null ? ref1$.city : void 8,
        address_country: (ref2$ = card.location) != null ? ref2$.country : void 8,
        address_state: (ref3$ = card.location) != null ? ref3$.state : void 8
      }, function(status, resp){
        if (resp.id != null) {
          return safeApply(function(){
            return callback(null, resp.id);
          });
        } else {
          return safeApply(function(){
            return callback(resp.error.message);
          });
        }
      });
    };
  };
  if (typeof window.Stripe === 'undefined') {
    throw 'please add <script src="https://js.stripe.com/v2/"></script>';
  } else {
    init();
  }
  return model;
}]);
angular.module('ablsdk').service('test', ["debug", function(debug){
  return function(input){
    return debug(function(){
      var test;
      test = input();
      if (test !== true) {
        throw "[FAILED TEST]" + input.toString();
      }
    });
  };
}]);
angular.module('ablsdk').service('through', ["p", "$timeout", function(p, $timeout){
  return function(func){
    var state;
    state = {
      result: null,
      hasResult: false,
      observers: []
    };
    func(function(scope){
      state.result = scope;
      state.hasResult = true;
      return p.each(function(it){
        return it(scope);
      })(
      state.observers);
    });
    return {
      then: function(cb){
        if (state.hasResult === true) {
          cb(state.result);
        }
        return state.observers.push(cb);
      }
    };
  };
}]);
var toString$ = {}.toString;
angular.module('ablsdk').service('typecheck', ["debug", "p", function(debug, p){
  var buildParseType, buildParsedTypeCheck, parseType, parsedTypeCheck;
  buildParseType = function(){
    var identifierRegex, tokenRegex;
    identifierRegex = /[\$\w]+/;
    function peek(tokens){
      var token;
      token = tokens[0];
      if (token == null) {
        throw new Error('Unexpected end of input.');
      }
      return token;
    }
    function consumeIdent(tokens){
      var token;
      token = peek(tokens);
      if (!identifierRegex.test(token)) {
        throw new Error("Expected text, got '" + token + "' instead.");
      }
      return tokens.shift();
    }
    function consumeOp(tokens, op){
      var token;
      token = peek(tokens);
      if (token !== op) {
        throw new Error("Expected '" + op + "', got '" + token + "' instead.");
      }
      return tokens.shift();
    }
    function maybeConsumeOp(tokens, op){
      var token;
      token = tokens[0];
      if (token === op) {
        return tokens.shift();
      } else {
        return null;
      }
    }
    function consumeArray(tokens){
      var types;
      consumeOp(tokens, '[');
      if (peek(tokens) === ']') {
        throw new Error("Must specify type of Array - eg. [Type], got [] instead.");
      }
      types = consumeTypes(tokens);
      consumeOp(tokens, ']');
      return {
        structure: 'array',
        of: types
      };
    }
    function consumeTuple(tokens){
      var components;
      components = [];
      consumeOp(tokens, '(');
      if (peek(tokens) === ')') {
        throw new Error("Tuple must be of at least length 1 - eg. (Type), got () instead.");
      }
      for (;;) {
        components.push(consumeTypes(tokens));
        maybeConsumeOp(tokens, ',');
        if (')' === peek(tokens)) {
          break;
        }
      }
      consumeOp(tokens, ')');
      return {
        structure: 'tuple',
        of: components
      };
    }
    function consumeFields(tokens){
      var fields, subset, ref$, key, types;
      fields = {};
      consumeOp(tokens, '{');
      subset = false;
      for (;;) {
        if (maybeConsumeOp(tokens, '...')) {
          subset = true;
          break;
        }
        ref$ = consumeField(tokens), key = ref$[0], types = ref$[1];
        fields[key] = types;
        maybeConsumeOp(tokens, ',');
        if ('}' === peek(tokens)) {
          break;
        }
      }
      consumeOp(tokens, '}');
      return {
        structure: 'fields',
        of: fields,
        subset: subset
      };
    }
    function consumeField(tokens){
      var key, types;
      key = consumeIdent(tokens);
      consumeOp(tokens, ':');
      types = consumeTypes(tokens);
      return [key, types];
    }
    function maybeConsumeStructure(tokens){
      switch (tokens[0]) {
      case '[':
        return consumeArray(tokens);
      case '(':
        return consumeTuple(tokens);
      case '{':
        return consumeFields(tokens);
      }
    }
    function consumeType(tokens){
      var token, wildcard, type, structure;
      token = peek(tokens);
      wildcard = token === '*';
      if (wildcard || identifierRegex.test(token)) {
        type = wildcard
          ? consumeOp(tokens, '*')
          : consumeIdent(tokens);
        structure = maybeConsumeStructure(tokens);
        if (structure) {
          return structure.type = type, structure;
        } else {
          return {
            type: type
          };
        }
      } else {
        structure = maybeConsumeStructure(tokens);
        if (!structure) {
          throw new Error("Unexpected character: " + token);
        }
        return structure;
      }
    }
    function consumeTypes(tokens){
      var lookahead, types, typesSoFar, typeObj, type;
      if ('::' === peek(tokens)) {
        throw new Error("No comment before comment separator '::' found.");
      }
      lookahead = tokens[1];
      if (lookahead != null && lookahead === '::') {
        tokens.shift();
        tokens.shift();
      }
      types = [];
      typesSoFar = {};
      if ('Maybe' === peek(tokens)) {
        tokens.shift();
        types = [
          {
            type: 'Undefined'
          }, {
            type: 'Null'
          }
        ];
        typesSoFar = {
          Undefined: true,
          Null: true
        };
      }
      for (;;) {
        typeObj = consumeType(tokens), type = typeObj.type;
        if (!typesSoFar[type]) {
          types.push(typeObj);
        }
        typesSoFar[type] = true;
        if (!maybeConsumeOp(tokens, '|')) {
          break;
        }
      }
      return types;
    }
    tokenRegex = RegExp('\\.\\.\\.|::|->|' + identifierRegex.source + '|\\S', 'g');
    return function(input){
      var tokens, e;
      if (!input.length) {
        throw new Error('No type specified.');
      }
      tokens = input.match(tokenRegex) || [];
      if (in$('->', tokens)) {
        throw new Error("Function types are not supported.\ To validate that something is a function, you may use 'Function'.");
      }
      try {
        return consumeTypes(tokens);
      } catch (e$) {
        e = e$;
        throw new Error(e.message + " - Remaining tokens: " + JSON.stringify(tokens) + " - Initial input: '" + input + "'");
      }
    };
  };
  buildParsedTypeCheck = function(){
    var any, all, isItNaN, types, defaultType, customTypes;
    any = p.any;
    all = p.all;
    isItNaN = p.isItNaN;
    types = {
      Number: {
        typeOf: 'Number',
        validate: function(it){
          return !isItNaN(it);
        }
      },
      NaN: {
        typeOf: 'Number',
        validate: isItNaN
      },
      Int: {
        typeOf: 'Number',
        validate: function(it){
          return !isItNaN(it) && it % 1 === 0;
        }
      },
      Float: {
        typeOf: 'Number',
        validate: function(it){
          return !isItNaN(it);
        }
      },
      Date: {
        typeOf: 'Date',
        validate: function(it){
          return !isItNaN(it.getTime());
        }
      }
    };
    defaultType = {
      array: 'Array',
      tuple: 'Array'
    };
    function checkArray(input, type){
      return all(function(it){
        return checkMultiple(it, type.of);
      }, input);
    }
    function checkTuple(input, type){
      var i, i$, ref$, len$, types;
      i = 0;
      for (i$ = 0, len$ = (ref$ = type.of).length; i$ < len$; ++i$) {
        types = ref$[i$];
        if (!checkMultiple(input[i], types)) {
          return false;
        }
        i++;
      }
      return input.length <= i;
    }
    function checkFields(input, type){
      var inputKeys, numInputKeys, k, numOfKeys, key, ref$, types;
      inputKeys = {};
      numInputKeys = 0;
      for (k in input) {
        inputKeys[k] = true;
        numInputKeys++;
      }
      numOfKeys = 0;
      for (key in ref$ = type.of) {
        types = ref$[key];
        if (!checkMultiple(input[key], types)) {
          return false;
        }
        if (inputKeys[key]) {
          numOfKeys++;
        }
      }
      return type.subset || numInputKeys === numOfKeys;
    }
    function checkStructure(input, type){
      if (!(input instanceof Object)) {
        return false;
      }
      switch (type.structure) {
      case 'fields':
        return checkFields(input, type);
      case 'array':
        return checkArray(input, type);
      case 'tuple':
        return checkTuple(input, type);
      }
    }
    function check(input, typeObj){
      var type, structure, setting, that;
      type = typeObj.type, structure = typeObj.structure;
      if (type) {
        if (type === '*') {
          return true;
        }
        setting = customTypes[type] || types[type];
        if (setting) {
          return setting.typeOf === toString$.call(input).slice(8, -1) && setting.validate(input);
        } else {
          return type === toString$.call(input).slice(8, -1) && (!structure || checkStructure(input, typeObj));
        }
      } else if (structure) {
        if (that = defaultType[structure]) {
          if (that !== toString$.call(input).slice(8, -1)) {
            return false;
          }
        }
        return checkStructure(input, typeObj);
      } else {
        throw new Error("No type defined. Input: " + input + ".");
      }
    }
    function checkMultiple(input, types){
      if (toString$.call(types).slice(8, -1) !== 'Array') {
        throw new Error("Types must be in an array. Input: " + input + ".");
      }
      return any(function(it){
        return check(input, it);
      }, types);
    }
    return function(parsedType, input, options){
      options == null && (options = {});
      customTypes = options.customTypes || {};
      return checkMultiple(input, parsedType);
    };
  };
  parseType = buildParseType();
  parsedTypeCheck = buildParsedTypeCheck();
  return function(type, input, options){
    return debug(function(){
      var result;
      result = parsedTypeCheck(parseType(type), input, options);
      if (!result) {
        return console.error("Type doesn't match with object", type, input);
      }
    });
  };
}]);
function in$(x, xs){
  var i = -1, l = xs.length >>> 0;
  while (++i < l) if (x === xs[i]) return true;
  return false;
}
angular.module('ablsdk').service('types', ["p", function(p){
  var types, Day, Activity, Timeslot;
  types = {
    Day: Day = (function(){
      Day.displayName = 'Day';
      var prototype = Day.prototype, constructor = Day;
      function Day(){}
      return Day;
    }()),
    Activity: Activity = (function(){
      Activity.displayName = 'Activity';
      var prototype = Activity.prototype, constructor = Activity;
      function Activity(){}
      return Activity;
    }()),
    Timeslot: Timeslot = (function(){
      Timeslot.displayName = 'Timeslot';
      var prototype = Timeslot.prototype, constructor = Timeslot;
      function Timeslot(){}
      return Timeslot;
    }()),
    is: function(get, obj){
      var Type;
      Type = get(types);
      return obj instanceof Type;
    },
    cast: curry$(function(get, obj){
      var Type, nobj, fill;
      Type = get(types);
      nobj = new Type;
      fill = function(prop){
        return nobj[prop[0]] = prop[1];
      };
      p.each(fill)(
      p.objToPairs(
      obj));
      return nobj;
    })
  };
  return types;
}]);
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
angular.module('ablsdk').service('watcher', ["$rootScope", "browser", "debug", function($rootScope, browser, debug){
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
}]);
angular.module('ablsdk').service('onlineBookingColors', function(){
  var arr;
  arr = [["Blue", "blue", '#2196F3'], ["Teal", "teal", '#009688'], ["Green", "green", '#4CAF50'], ["Grey", "grey", '#9E9E9E'], ["Blue grey", "blue_grey", '#607D8B'], ["Yellow", "yellow", '#FFEB3B'], ["Indigo", "indigo", '#3F51B5'], ["Red", "red", '#F44336'], ["Black", "black", '#000000']];
  return arr;
});