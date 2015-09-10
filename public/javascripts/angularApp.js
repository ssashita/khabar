/**
 * 
 */
var app = angular.module("Khabar", [ "ui.router" ]);
app.controller("MainCtrl", [ '$scope', 'posts', 'auth', function($scope, posts, auth) {
	$scope.test = "KKHHABBARR";
	$scope.posts = posts.posts;
	$scope.addPost = function() {
                if(!$scope.title || $scope.title==='') {return;}
		posts.create({
			title : $scope.title,
			link : $scope.link
		});
		
		$scope.title = '';
		$scope.link = '';
	};
	$scope.incrementVotes = function(post) {
		posts.upVote(post);
	};
	$scope.decrementVotes = function(post) {
		if (post.upVotes === 0)
			return;
		post.upVotes -= 1;
	};
    $scope.isLoggedIn = auth.isLoggedIn;
} ]).controller(
		"PostsCtrl",
		[ '$scope', 'posts', 'post','auth',
				function($scope, posts, post, auth) {
			        $scope.post=post;
                    
                    $scope.newcomment={};
                    
                    $scope.addComment=function() {
                        if($scope.newcomment.body ==='') {return;}
                        posts.addComment(post._id, {
                            body: $scope.newcomment.body,
                            author: 'user'
                        }).success(function(comment) {
                            $scope.post.comments.push(comment);
                        });
                        $scope.newcomment.body = '';
                    };
                    $scope.upvoteComment= function(comment) {
                        posts.upvoteComment(post,comment);                        
                    };
                    
                    $scope.isLoggedIn = auth.isLoggedIn;
				} ]);

app.controller('AuthCtrl', ['$scope', '$state', 'auth',
    function($scope, $state, auth) {
      //$scope.user = {};
      $scope.register = function() {
         auth.register($scope.user).error(function(error) {
          $scope.error = error;
           }).then(function() {
                 $state.go('home');
               });
       };
      $scope.login = function() {
       auth.login($scope.user).error(function(error) {
          $scope.error = error;
       }).then(function() {
            $state.go('home');
          });
      };
    }]
);

app.controller('NavCtrl', ['$scope', 'auth',
         function($scope, auth) {
           $scope.isLoggedIn = auth.isLoggedIn;
           $scope.currentUser = auth.currentUser;
             //alert(JSON.stringify($scope.currentUser()));
           $scope.logout = auth.logout;
         }
    ]);

app.factory("posts", [ '$http','auth', function($http, auth) {
	var obj = {
		posts : [],
	};
        
        obj.getAll = function()  {
          return $http.get('/posts').success(function(data) {
              //alert(JSON.stringify(obj));
              //we need to pass obj.posts and not this.posts because we 
              //dont knowon which object this function will be called.
              //and we are interested in obj which being returned by the container 
              //function
              angular.copy(data,obj.posts);
           });
        };
        obj.create = function(post) {
          //Probably better design to call the success() function in the caller i.e.
          //controller
          return $http.post('/posts',post,  {
              headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data) {
             obj.posts.push(data);
           });
        };
        obj.upVote = function(post) {
          //Probably better design to call the success() function in the caller i.e.
          //controller
          return $http.put('/posts/'+post._id+'/upvote', null,  {
              headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data)  {
             post.upvotes +=  1;
          });
        };
        obj.get = function(id) {
          return $http.get('/posts/'+id).then(function(res) {
             return res.data;
           });
        };
        obj.addComment = function(id, comment) {
          return $http.post('/posts/' + id + '/comments', comment,  {
              headers: {Authorization: 'Bearer '+auth.getToken()}
            });
        };
        obj.upvoteComment=function(post,comment) {
          //Probably better design to call the success() function in the caller i.e.
          //controller
          var command = '/posts/'+post._id+'/comments/'+comment._id+'/upvote';
          return $http.put(command, null,  {
              headers: {Authorization: 'Bearer '+auth.getToken()}
            }).success(function(data) {
                                        comment.upvotes += 1;
                                        });
        };
	return obj;
}]);

app.factory('auth', ['$http', '$window', function($http, $window) {
   var auth = {};

   auth.saveToken = function(token) {
    $window.localStorage['khabar-token'] = token;
   };

   auth.getToken = function() {
     return $window.localStorage['khabar-token'];
   }

   auth.isLoggedIn = function() {
     var token = auth.getToken();
     if (token) {
       var payload = JSON.parse($window.atob(token.split('.')[1]));
       return payload.exp > Date.now() / 1000;
     } else {
        return false;
     }
   };
   
   auth.currentUser = function() {
     if (auth.isLoggedIn()) {
       var token = auth.getToken();
       var payload = JSON.parse($window.atob(token.split('.')[1]));
       return payload.username;
     }
   };

   auth.register = function(user){
      return $http.post('/register', user).success(function(data) {
         auth.saveToken(data.token);
       });
   };

   auth.login = function(user) {
     return $http.post('/login', user).success(function(data) {
       auth.saveToken(data.token); 
    });
   };
 
   auth.logout = function(user) {
     $window.localStorage.removeItem('khabar-token');
   };
   return auth;
}]);

app.config([ '$stateProvider', '$urlRouterProvider',
		function($stateProvider, $urlRouterProvider) {

			$stateProvider.state('home', {
				url : "/home",
				templateUrl : "/home.html",
				controller : "MainCtrl" ,
                                resolve:  {
                                  postPromise: ['posts', function(posts) {
                                     var val = posts.getAll();
                                     return val;
                                    }] 
                                 }
			}).state('posts', {
				url : "/posts/{id}",
				templateUrl : "/posts.html",
				controller : "PostsCtrl",
                                resolve:  {
                                  post: ['$stateParams','posts', 
                                             function($stateParams,posts) {
                                              return posts.get($stateParams.id);
                                    }] 
                                }
			}).state('login', {
                             url: '/login',
                             templateUrl: '/login.html',
                             controller: 'AuthCtrl',
                             onEnter: ['$state', 'auth', function($state, auth) {
                                if(auth.isLoggedIn()) {
                                   $state.go('home');
                                }
                             }]
                            })
                          .state('register', {
                             url: '/register',
                             templateUrl: '/register.html',
                             controller: 'AuthCtrl',
                             onEnter: ['$state', 'auth', function($state, auth) {
                                if(auth.isLoggedIn()) {
                                   $state.go('home');
                                }
                             }]                            
                           });
			$urlRouterProvider.otherwise('home');
		} ]);
