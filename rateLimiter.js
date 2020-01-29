const NodeCache = require( "node-cache" );
const myCache = new NodeCache();

module.exports = (options) => {
    options = Object.assign(
        {
            limit: 10, // limit during window
            window: 60, // windows in seconds
            message: "Request limit reached, please try again later.",
            statusCode: 429, // Too Many Requests (RFC 6585)
            headers: true, //Send header
            getToken: function(req, res) {
                //using ip for simplicity
                return req.ip;
            }
        },
    options
  );
  //using only for simplicity
  options.store = myCache;

  const setHeaders = (currentUses, reset, res) => {
    if(options.headers) {
        res.set('RateLimit-Limit', options.limit);
        res.set('RateLimit-Remaining', options.limit - currentUses);
        res.set('RateLimit-Reset', reset);
    }
  }

  const getTTL = (savedTtl)  => {
    let currentDate = new Date().getTime();
    return (savedTtl - currentDate)/1000;
  }
  
  return (req, res, next) => {
    const key = options.getToken(req, res);

    let currentValue = options.store.get(key);

    if(currentValue) {
        let savedTtl = options.store.getTtl(key);
        let ttl = getTTL(savedTtl);
        let newValue = parseInt(currentValue) + 1;

        setHeaders(newValue, ttl, res); 
        
        if (newValue > options.limit) {
            res.status(options.statusCode).send(options.message);
            return;
        } 
        options.store.set(key, newValue, ttl);
        next();
    } else {
        options.store.set(key, 1, options.window);
        setHeaders(1, options.window, res);
        next();
    }
  }
}