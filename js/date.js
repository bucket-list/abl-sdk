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
});
function bind$(obj, key, target){
  return function(){ return (target || obj)[key].apply(obj, arguments) };
}