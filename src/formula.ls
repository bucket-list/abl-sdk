angular
  .module(\ablsdk)
  .service do
      * \formula
      * (p, debug)->
          get-slot-price = (type, slot)->
              arr =
                 slot?charges ? []
              arr |> p.find (-> it.type is type or it.subtype is type or it.description is type)
                  |> (-> it?amount ? 0)
          get-visual-price = (ac)->
              if ac?timeslots?length > 0
                  merge = (arrays)-> [].concat.apply([], arrays)
                  only-default = (slot)->
                    (slot?charges ? []) |> p.filter (-> it.is-default)
                                        |> p.filter (-> it.status is \active)
                                        |> p.map (-> it.amount)
                  only-adult = (slot)->
                    type = \Adult
                    (slot?charges ? []) |> p.filter (-> it.type is type or it.subtype is type or it.description is type)
                                        |> p.filter (-> it.status is \active)
                                        |> p.map (-> it.amount)
                  all = (slot)->
                    (slot?charges ? [])  |> p.filter (.status is \active) |> p.map (.amount)
                  merged-adults = 
                    merge ac.timeslots.map(only-adult)
                  
                  merged-all =
                    merge ac.timeslots.map(all)
                  merged-default = 
                    merge ac.timeslots.map(only-default)
                  max = (array)-> 
                    Math.max.apply(Math, array)
                  min = (array)->
                    Math.min.apply(Math, array)
                  final = 
                     | merged-default.length > 0 => min merged-default
                     | merged-adults.length > 0 => max merged-adults
                     | merged-all.length > 0 => max merged-all
                     | _ => 0
                  return final
              else
                 \Non
          get-slot-price: (slot)->
              get-slot-price \Adult, slot
          get-visual-price: get-visual-price
          get-adult-price: (ac)->
              get-slot-price \Adult, ac?timeslots?0
          get-youth-price: (ac)->
              get-slot-price \Youth, ac?timeslots?0