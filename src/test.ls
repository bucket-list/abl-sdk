angular
  .module \ablsdk
  .service \test, (debug)->
    (input)->
       debug ->
         test = input!
         if test isnt yes
            throw "[FAILED TEST]" + input.to-string!