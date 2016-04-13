angular
  .module \ablsdk
  .service \ablcalc, ($xabl, $timeout, p, debug, test, typecheck)->
      
      
      sum = (arr)->
        | typeof arr is \undefined => 0
        | typeof arr is null => 0
        | _ => arr |> p.sum
      (input-new-charges, input-prevous-charges, paid)->
          prevous-charges = input-prevous-charges ? []
          new-charges = input-new-charges?filter(-> it.status is \active) ? []
          #debug do
          #   prevous-charges: prevous-charges
          #   new-charges: new-charges
          #   input-new-charges: input-new-charges
          #   input-prevous-charges: input-prevous-charges
          make-new-charge = (charge)->
            name: charge.name
            quantity: 0
            amount: charge.amount
            _id: charge._id
          by-price = (a, b)->
            b.amount - a.amount
          make-old-charge = (arr)->
            name: arr.0.name
            amount: arr.0.amount
            quantity: arr.length
            _ids: arr |> p.map (._id)
          old-amounts = (type)->
            prevous-charges |> p.filter (.type is type)
                            |> p.group-by (-> it.name + it.amount)
                            |> p.obj-to-pairs 
                            |> p.map (.1)
                            |> p.map make-old-charge
                            |> p.sort-with by-price
          exclude = (type, charge)-->
            old =
              old-amounts(type) |> p.find (-> charge.name is it.name and charge.amount is it.amount)
            if old?
             old.old = yes
            !old?
          available-amounts = (type)->
            new-charges  |> p.filter (.type is type)
                         |> p.map make-new-charge
                         |> p.filter exclude type
                         |> p.sort-with by-price
          get-amounts = (type)->
             [old-amounts, available-amounts] |> p.map (-> it type) |> p.concat
          test ->
             get-amounts(\aap).length > 0
            
          test ->
            top =
               get-amounts(\app) |> p.head
            return yes if !top
            return no  if !top.amount? or !top.quantity? or !top.name?
          
          
          
          state =
            attendees: get-amounts \aap 
            addons: get-amounts \addon
          total-adjustment = ->
             adjustment.list |> p.map (.amount) |> p.sum
          calc-subtotal = ->
              (state.attendees.map(calc-price) |> sum) + total-adjustment! + total-addons!
          calc-tax-fee = (charge)->
            | charge.type is \tax => calc-subtotal! / 100 * charge.amount
            | charge.type is \fee => (state.attendees.map(-> it.quantity) |> sum) * charge.amount
            | _ => 0
          calc-taxes-fees = ->
              new-charges.map(calc-tax-fee) |> sum
          show-price = (attendee)->
              (new-charges.filter(-> it.type is \aap and it.name is attendee.name)?0?amount ? 0)
          calc-price = (attendee)->
              show-price(attendee) * attendee.quantity
          show-addon-price = (addon)->
              state.addons.filter(-> it.name is addon.name).map(-> it.amount) |> sum
          calc-addon-price = (addon)->
              show-addon-price(addon) * addon.quantity
          total-addons = ->
              state.addons.map(calc-addon-price) |> sum
          calc-coupon = ->
              code = coupon.codes.0
              origin = Math.abs(code?amount ? 0)
              percentage = code?percentage ? no
              debug \calc-coupon, code
              current-price = if code?is-total then calc-total-without-coupon! else calc-subtotal!
              result =
                | percentage is no and origin < current-price => origin
                | percentage is no => current-price
                | _  => current-price / 100 * origin
              result * -1
          warning = (charge, name)->
              removed =
                charge.status is \inactive
              type = charge.type
              changed = charge.old
              name = 
                | type is \aap => "pricing level"
                | type is \addon => "add-on"
              res = 
                | removed and name is \removed => "Warning: This #name no longer exists. You can only reduce the quantity at this #name. If you wish to offer another #name at this price, please create on Adjustment to currect the price."
                | changed and name is \changed => "Warning: This #name has changed since the booking was created. You can only reduce the quantity at this #name. If you wish to offer the old #name, please create an Adjustment."
                | (removed or changed) and name is \mutated => yes
                | _ => ""
              res
          calc-total-without-coupon = ->
              calc-subtotal! + calc-taxes-fees!
          calc-total = ->
              calc-total-without-coupon! + calc-coupon!
          calc-previous-total = ->
              prevous-charges |> p.map (.amount)
                              |> p.sum
          deposit = (paid ? []) |> p.map (.amount)
                                |> p.sum
          calc-balance-due = ->
              -(calc-total! - deposit)
          adjustment = 
            list: prevous-charges |> p.filter(-> it.type is \adjustment)
            name: ""
            amount: ""
            is-edit: no
            show: no
            add: ->
              new-item = 
                name: adjustment.name
                amount: adjustment.amount
              new-item.amount *= 100
              adjustment.list.push new-item
              adjustment.name = ""
              adjustment.amount = ""
              adjustment.show = no
              adjustment.is-edit = no
            removable: (item)->
              !item._id?
            remove: (item)->
              index = adjustment.list.index-of(item)
              adjustment.list.splice index, 1
            edit: (c)->
              if adjustment.is-edit
                adjustment.add!
              adjustment.name = c.name
              adjustment.amount = c.amount / 100
              adjustment.show = yes
              adjustment.is-edit = yes
              #adjustment.code = c.code
              adjustment.remove c

          coupon =
            codes: prevous-charges |> p.filter(-> it.type is \coupon)
            calc: calc-coupon
            show: no
            edit: (c)->
              coupon.code = c.code
              coupon.remove c
              coupon.show = yes
            remove: (c)->
              index = coupon.codes.index-of c
              if index > -1
                 coupon.codes.splice index, 1
            add: (activity)->
              return if (coupon.code ? "").length is 0
              coupon.code = coupon.code.to-upper-case!
              coupon.error = 
                 | coupon.code.length is 0 => "Code is required"
                 | coupon.code.length < 6 => "6 chars are required"
                 | _ => ""
              return if coupon.error.length > 0
              apply = (data)->
                success = ->
                  coupon.codes.push data
                  coupon.code = ""
                  coupon.success = "Coupon #{data.couponId} added successfully"
                  coupon.show = no
                  $timeout do 
                     * ->
                         delete coupon.success
                     * 3000
                  ""
                #debug "activity", data.activities.0, activity
                coupon.error =
                  | data.status is \inactive => "Coupon is inactive"
                  | data.max-redemptions isnt 0 and data.max-redemptions <= data.redemptions => "This coupon has been fully redeemed."
                  | moment!.diff(moment(data.redeem-by), \minutes) > 0 => "This coupon is expired"
                  | data.activities.length > 0 and data.activities.0 isnt activity => "This coupon is not valid for this activity."
                  | _ => success!

              
              $xabl
                .get "coupon/#{coupon.code}"
                .success (data)->
                    apply data
                .error (data)->
                    coupon.error = data?errors?0 ? "Coupon not found"
                    coupon.code = ""
                    coupon.show = yes
            code: ""
          warning: warning
          handle: ($event)->
            debug \handle, $event
            coupon.code = (coupon.code ? "").to-upper-case!
          coupon: coupon
          adjustment: adjustment
          addons: state.addons
          attendees: state.attendees
          show-attendees: ->
            state.attendees |> p.filter (-> it.quantity > 0) |> p.map ((o)-> "#{o.quantity} #{o.name}") |> p.join ", "
          show-addons: ->
            state.addons |> p.filter (-> it.quantity > 0) |> p.map ((o)-> "#{o.quantity} #{o.name}") |> p.join ", "
          total-without-taxesfees: calc-subtotal
          calc-coupon: calc-coupon
          coupon-code: ->
             code = coupon.codes.0
             code?couponId ? code?name ? "UNKNOWN"
          calc-tax-fee: calc-tax-fee
          calc-taxes-fees: calc-taxes-fees
          show-price: show-price
          calc-price: calc-price
          show-addon-price: show-addon-price
          calc-addon-price: calc-addon-price
          total-addons: total-addons
          calc-subtotal: calc-subtotal
          calc-total: calc-total
          calc-previous-total: calc-previous-total
          calc-balance-due: calc-balance-due
