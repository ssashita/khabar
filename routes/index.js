var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');

var passport = require('passport');
var User = mongoose.model("User");

var jwt = require('express-jwt');

var auth = jwt({secret: 'SECRET', userProperty: 'payload'});

/* home page */
router.get('/', function(req,res,next) {
   res.render('index', {title: 'Express' });
});

/* GET all posts. */
router.get('/posts', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  Post.find(function(err, posts) {
     if (err) { return next(err);}
     res.json(posts);
     return next();
  });
});


/* Post a post */
router.post('/posts',auth, function(req, res,next) {
  var post = new Post(req.body);
  post.author = req.payload.username;
  post.save(function(err, post) {
     if(err) { return next(err); }
     res.json(post);
     return next();
   });
});

/* define a post param */
router.param('post', function(req,res,next,id) {
   var query = Post.findById(id);
   query.exec(function(err,post) {
      if (err) { return next(err);}
      if (!post) { return next(new Error('can\'t find post'));}
      req.post = post;
      return next();
    });
});

/* get a post with an id*/
router.get('/posts/:post', function(req,res,next) {
   req.post.populate('comments', function(err,post) {
     if (err) { return next(err);}
     res.json(req.post);
     return next();
   });
  });

/* upvote a post */
router.put('/posts/:post/upvote', auth, function(req, res, next)  {
   req.post.upVote(function(err, post)  {
       if (err) { return next(err);  }
       res.json(post);
       return next();
   });
});

/*get comments for a post specified by id*/
router.get('/posts/:post/comments', function(req, res, next) {
      req.comments=[];
      var len=req.post.comments.length;
      var commentCollect = function(err,comment) {
          if (err) return next(err);
          if (!comment) return next(new Error('comment not found error'));
          req.comments.push(comment);
          if (len === req.comments.length) { //note this if
            console.log("comments:");
            console.log(req.comments);
            res.json(req.comments);
            return next();
          }
        };
      for (var i =0; i<len;i++) {
        var query = Comment.findById(req.post.comments[i]);
        query.exec(commentCollect);
      }
});

/*post a comment for a post specified by id*/
router.post('/posts/:post/comments', auth, function(req, res, next) {
    var comment = new Comment(req.body);
    //console.log(comment);
    comment.post = req.post;
    comment.author = req.payload.username;
    //console.log(comment.post);
    comment.save(function(err, comment)  {
       if (err) return next(err);
       req.post.comments.push(comment);
       req.post.save( function(err, post)  {
         if (err) {return next(err);}
         res.json(comment);
         return next();
       });
    });
});

/*define a comment param. parameter fetching for comment specified by id*/
router.param('comment', function(req,res,next,id) {
  var query = Comment.findById(id);
  query.exec(function(err,comment) {
    if(err) return next();
    if(!comment) return next(new Error('can\'t find comment'));
    req.comment=comment;
    return next();
  });
});

/*get a comment specified by id for a given post specified by id*/
router.get('/posts/:post/comments/:comment', function(req,res,next) {
   var comment = req.comment;
   console.log(comment);
   res.json(comment);
   return next();
});

/*upvote a comment specified by id for a post specified by id*/
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  //req.comment is calculated in the router.param callback
  req.comment.upVote(function(err,comment) {
     if(err) return next(err);
     res.json(comment);
     return next();
   });
});

router.post('/register', function(req, res, next) {
   if(!req.body.username || !req.body.password) {
       return res.status(400).json({message: 'Please fill out all fields'});
    }
    var user = new User();
    user.username = req.body.username;
    user.setPassword(req.body.password);
    user.save(function(err) {
      if(err) { return next(err);}

       return res.json({token: user.generateJWT()});
     })
});

router.post('/login', function(req, res, next) {
   if(!req.body.username || !req.body.password) {
     return res.status(400).json({message: 'Please fill out all fields'});
   }

   passport.authenticate('local', function(err, user, info) {
      if(err) { return next(err); }
      if(user)  {
        return res.json({token: user.generateJWT()});
      } else {
          return res.status(401).json(info);
       }
    })(req, res, next);
});



module.exports = router;
