angular
  .module \ablsdk
  .service \loader, ($xabl, types, p)->
      activities: (options, callback)->
            config = $.param do
              location: options.location ? ""
              page-size: 100
              page: options.page ? 0
              no-empty: no
              date-range:
                * moment!.start-of(\day).format!
                * moment!.clone!.add(18, \months).end-of(\day).format!
            $xabl
                .get "operators/#{$xabl.options.key}"
                .error ->
                  throw "An error occurred getting Operator information for key #{$xabl.options.key}"
                .success (info)->
                   $xabl
                      .get "activities?#config"
                      .success (resp)->
                        if typeof! resp.list isnt \Array
                          throw ".list is not Array"
                        if typeof! resp.preferences isnt \Object
                          throw ".preferences is not Object"

                        callback do
                            activities: resp.list |> p.map types.cast (.Activity)
                            preferences: resp.preferences
                            info: info
