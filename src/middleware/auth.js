exports.isAuthenticated = (req, res, next) => {
  if (
    req.session.isAuthenticated &&
    req.session.userAgent === req.headers["user-agent"] &&
    Date.now() - req.session.lastActivity < 24 * 60 * 60 * 1000
  ) {
    req.session.lastActivity = Date.now();
    next();
  } else {
    res.redirect("/login");
  }
};
