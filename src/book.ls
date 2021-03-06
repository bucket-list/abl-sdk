angular
  .module \ablsdk
  .service \ablbook, ($xabl, p, stripe, debug, prefill, safe-apply)->
      (activity, global-callback)->
            state =
               tried-checkout: no
               typing: ''
               braintree-client: null
               loading: no
               idempotency-key: null
               form:
                  error: ""
                  agreed: no
                  email: ''
                  name: ''
                  phone: ''
                  address: ''
                  location: {}
                  notes: ''
                  date:
                    start: null
                    end: null
                  credit-card:
                    card: ''
                    exp-date: ''
                    cvv: ''
                    address_zip: ''
               calendar:
                 value: null
                 visible: no
                 current-activity: activity
                 closed: (chosen)->
                   debug \closed-calendar, chosen
                   state.form.date.start = state.calendar.date.start
                   state.form.date.end = state.calendar.date.end
                   global-callback \slot-chosen, chosen
            get-day = (date)->
              if date?
                 res = do
                  if date?format?
                    date
                  else
                    moment(date)
                 res.format(\YYYYMMDD) |> parse-int
              else null
            investigate-date = (bag)->
              _ =
                | bag.start is null => \none
                | get-day(bag.start) isnt get-day(bag.end) => \different
                | _ => \same
            valid = (form)->
              !state.loading and form.$valid
            issue = (form)->
              for field of fields
                if fields.has-own-property field
                  text =
                    message form, field
                  if text?length > 0
                     return text
              "Please check the form"
            error = (message)->
              state.form.error = message
            close-error = ->
              error ""
            reset-idempotency-key = ->
               state.idempotency-key = do
                  s = ->
                    Math.floor((1 + Math.random!) * 0x10000).toString(16).substring(1)
                  s! + s! + \- + s! + \- + s! + \- + s! + \- + s! + s! + s!
            reset-idempotency-key!
            few = (arr)->
              arr?filter?(-> it.quantity > 0) ? []
            sum = (arr)->
                | typeof arr is \undefined => 0
                | typeof arr is null => 0
                | arr.length is 0 => 0
                | _ => arr.reduce((x, y)-> x + y)
            disabled-order = ->
               sum(state.calendar.calc.attendees.map(-> it.quantity)) is 0
            cardify = (val, val2)->
              const newval =
                  | val.length is 4 => val + " "
                  | val.length is 9 => val + " "
                  | val.length is 14 => val + " "
                  | val.length is 19 => val + " "
                  | _ => val
              newval + val2
            cardify2 = (val, val2)->
              const newval =
                  | val.length is 4 => val + " "
                  | val.length is 11 => val + " "
                  | _ => val
              newval + val2
            
            get-event-instance-id = ->
              if !state.calendar._id?
                throw "Cannot get event instance id because calendar._id is not defined"
              event-id = 
                 activity.timeslots |> p.find(-> it._id is state.calendar._id) 
                                    |> (-> it?event-id)
              if !event-id?
                 throw "event id is not found by id #{state.calendar._id} in [#{activity.timeslots.map(-> it._id).join(',')}]" 
                  
              event-id + \_ + state.calendar.date.origin
            booking-process = (token, callback)->
              f = state.form
              a = activity
              
              make-nulls = (total)->
                [1 to total] |> p.map (-> null)
              #debug state.calendar.calc.attendees
              coupon = 
                  state.calendar.calc.coupon.codes.length > 0
              agent-code = 
                  state.calendar.calc.agent.codes.length > 0
                  
              free = 
                  state.calendar.calc.calc-total! is 0
              req =
                is-mobile: f.is-mobile ? no
                stripe-token: token
                coupon-id: if coupon
                           then state.calendar.calc.coupon.codes.0.coupon-id
                           else undefined
                payment-method: | free and coupon => \gift
                                | free => \cash
                                | _ => \credit
                agent-code: if agent-code
                            then state.calendar.calc.agent.codes.0.code
                            else undefined
                event-instance-id: get-event-instance-id!
                addons: state.calendar.calc.addons |> p.map ((a)-> [a._id, make-nulls a.quantity])
                                                   |> p.pairs-to-obj
                attendees:  state.calendar.calc.attendees |> p.map ((a)-> [a._id, make-nulls a.quantity])
                                                          |> p.pairs-to-obj
                answers: state.calendar.questions |> p.map ((a)-> [a._id, a.answer])
                                                  |> p.pairs-to-obj
                adjustments: state.calendar.calc.adjustment.list
                full-name: f.name
                email: f.email
                phone-number: f.phone
                notes: f.notes
                location: f.location
                currency: \usd
                operator: activity.operator._id || activity.operator
                _custom-headers:
                  "Idempotency-Key" : state.idempotency-key
              $xabl
                .post do
                  * \bookings
                  * req
                .success (data)->
                  if data.booking-id?
                     f.booking-id = data.booking-id
                     reset-idempotency-key!
                     callback data
                  else
                     error(e.errors?0 ? "Server error")
                .error (e)->
                     error(e.errors?0 ? "Server error")
                .finally ->
                   state.loading = no
            stripe-process = (key, callback)->
               if typeof key is \undefined
                 state.loading = no
                 return error "Stripe key is not defined"
               stripe.set-publishable-key key
               cc = state.form.credit-card
               exp-date =
                    cc.exp-date.split(\/)
               f = state.form
               req =
                 number: cc.card
                 cvc: cc.cvv
                 address_zip: cc.address_zip
                 exp_month: exp-date.0
                 exp_year: "20#{exp-date.1}"
                 full-name: f.full-name ? f.name
                 location: f.location
                 state: f.state
               stripe
                   .create-token do
                      * req
                      * (err, token)->
                          if err?
                            state.loading = no
                            return error err
                          booking-process token, callback
            payment-setup = ->
              $xabl
                  .get "payments/setup?operator=#{activity.operator._id || activity.operator}"
            validate = (form)->
              return no if state.loading is yes
              #debug \change-to-tried-checkout, \validate
              state.tried-checkout = yes
              is-valid = valid(form)
              if not is-valid
                 error issue(form)
              is-valid
            booking-success = (booking)->
              state.booking = booking
              global-callback \success, booking
            checkout = (form, more-data)->
              if validate(form)
                state.loading = yes
                if state.calendar.calc.calcTotal! > 0
                  payment-setup!
                    .success (data)->
                        stripe-process data.public-key, booking-success
                    .error (err)->
                        state.loading = no
                        error err
                        global-callback \error, error
                else 
                  booking-process "", booking-success
            agree = ->
              state.form.agreed = !state.form.agreed
              try-checkout!
            is-error = (v) ->
              v.required or v.pattern or v.minlength or v.maxlength or v.phone
            show-error-logical = (name, v)->
              #if state.tried-checkout is yes
              s = fields[name].state
              show = 
                | state.tried-checkout => yes
                | !s.touched and !state.tried-checkout => no
                |  s.active and !state.tried-checkout => no
                | !s.active and s.touched => yes
                | _ => no
              #debug do 
              #  * "!s.touched and !state.tried-checkout": !s.touched and !state.tried-checkout
              #    "s.active and !state.tried-checkout": s.active and !state.tried-checkout
              #    "!s.active and s.touched": !s.active and s.touched
              #    "state.tried-checkout": state.tried-checkout
              if show 
              then show-error name, v
              else ""
            show-error = (name, v) ->
              | v.required => fields[name].messages?required ? "#{fields[name].title} is required"
              | v.pattern => fields[name].messages?pattern ? "Please enter a valid #{fields[name].example}"
              | v.minlength => fields[name].messages?minlength ?  "#{fields[name].title} is too short"
              | v.maxlength => fields[name].messages?maxlength ? "#{fields[name].title} is too long"
              | v.phone => fields[name].messages?phone ? "#{fields[name].title} is not valid phone number"
              | _ => "please check #{fields[name].title}"
            fields =
              email:
                  title: "Email Address"
                  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i
                  example: 'nickname@email.com'
                  placeholder: 'Email'
                  state: 
                    index: 1
                    touched: no
                    active: no
              name:
                  pattern: ''
                  title: "Full Name"
                  example: 'Your name'
                  placeholder: 'Name'
                  state: 
                    index: 2
                    touched: no
                    active: no
              phone:
                  title: "Phone Number"
                  pattern: /^[0-9]{3}[-][0-9]{3}[-][0-9]{3,5}$/i
                  placeholder: "Phone +1 123-456-1234"
                  example: "+1 123-456-1234"
                  state: 
                    index: 3
                    touched: no
                    active: no
              address:
                  pattern: ''
                  title: "Address"
                  example: 'Address'
                  placeholder: 'Home address'
                  state: 
                    index: 4
                    touched: no
                    active: no
              notes:
                  pattern: ''
                  title: "Notes"
                  example: "Notes"
                  placeholder: "Notes"
                  state: 
                    index: 5
                    touched: no
                    active: no
              address_zip:
                  pattern: ''
                  example: '12345'
                  title: "Postal Code"
                  placeholder: "Postal Code"
                  normalize: (value)->
                    value
                  state: 
                    index: 6
                    touched: no
                    active: no
              card:
                  pattern: /(^[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}$)|(^[0-9]{4} [0-9]{6} [0-9]{5}$)/i
                  example: 'Card Number'
                  title: "Credit Card Number"
                  placeholder: "Credit Card Number"
                  normalize: (value)->
                    return if typeof value is \undefined
                    strip-value = value.split(' ').join('')
                    return if strip-value.length < 15
                    cvv = (number)->
                      fields.cvv.pattern = fields.cvv.patterns[number]
                      fields.cvv.messages.pattern = fields.cvv.messages.patterns[number]
                    mask = (func)->
                      state.form.credit-card.card =
                         strip-value |> p.fold func, ""
                                     |> (-> it.substr(0, 19))
                    debug \strip-value, strip-value.length, strip-value
                    if strip-value.length is 15
                      mask cardify2
                      cvv 4
                    else if strip-value.length is 16
                      mask cardify
                      cvv 3
                      
                  state: 
                    index: 7
                    touched: no
                    active: no
              exp-date:
                  pattern: /[0-9]{2}\/[0-9]{2}/i
                  example: "05/15"
                  title: "Exp Date"
                  placeholder: 'Exp Date (MM/YY)'
                  normalize: (value, key-code)->
                     
                     e = value?replace(\/,'') ? ""
                     t = ->
                       it ? ""
                     state.form.credit-card.exp-date =
                       | e.length is 2 and key-code is 8 => e.0  + e.1
                       | e.length is 2 => e.0 + e.1 + \/
                       | e.length > 2 => e.0 + e.1 + \/ + t(e.2) + t(e.3)
                       | _ => e
                  state: 
                    index: 8
                    touched: no
                    active: no
              start-date: 
                  state: 
                    index: 11
                    touched: no
                    active: no
              cvv: do 
                  patterns = 
                    3 : /^[0-9]{3}$/i 
                    4 : /^[0-9]{4}$/i
                  message-patterns =
                    3 : "CVV must be 3 digits (e.g. 123)"
                    4 : "CVV must be 4 digits (e.g. 1234)"
                  pattern: patterns.3
                  patterns: patterns
                  example: "000"
                  title: "CVV"
                  placeholder: "CVV"
                  state: 
                    index: 9
                    touched: no
                    active: no
                  messages: 
                    pattern: message-patterns.3
                    patterns: message-patterns
                    
              agreed: 
                  title: "Confirmation"
                  pattern: \true
                  messages: 
                    required: "Please accept the terms and conditions"
                  state: 
                    index: 10
                    touched: no
                    active: no
            try-checkout = ->
              if state.form.agreed 
                #debug \change-to-tried-checkout, \try-checkout
                state.tried-checkout = yes
            message = (form, name)->
              sorted = 
                fields |> p.obj-to-pairs |> p.sort-by (.1.state.index) |> p.pairs-to-obj
              for field of sorted
                if fields.has-own-property field
                   val = form[field]?$error
                   if val and is-error(val)
                      if field is name
                        return show-error-logical field, val
                      return ""
              ""
            placeholder = (name)->
                fields[name].placeholder
            prefill ->
              f = state.form
              f.email = "a.stegno@gmail.com"
              f.name = "Test User"
              f.phone = "+380665243646"
              f.address = "664 Cypress Lane, Campbell, CA, United States"
              f.notes = "Some test notes"
              c = state.form.credit-card
              c.card = "5105 1051 0510 5100"
              c.address_zip = "12345"
              c.exp-date = "05/17"
              c.cvv = "333"
              state.form.agreed = yes
            state
              ..handle = (event)->
                safe-apply ->
                  name = event.target.name #card, #cvv
                  type = event.type #focus, blur, keyup
                  value = event.target.value #input value
                  field = fields[name]
                   
                  
                  #if event.target.tabindex=
                  return if !field?
                  switch type
                    case \keyup
                      field.normalize? value, event.key-code
                    case \focus
                      field.state.active = yes
                      field.state.touched = yes
                    case \blur 
                      field.state.active = no
              ..set-index = (name, index)->
                field = fields[name]
                return index if !field?
                field.state.index = index
                index
              ..investigate-date = investigate-date
              ..get-event-instance-id = get-event-instance-id
              ..placeholder = placeholder
              ..close-error = close-error
              ..checkout = checkout
              ..validate = validate
              ..agree = agree
              ..fields = fields
              ..few = few
              ..disabled-order = disabled-order
              ..message = message
              #..nobody = nobody
              #..different-days = different-days
              #..more-then-one = more-then-one
            state
