var app = angular.module('app', ['ngResource', 'ngMaterial', 'ngMessages']);

app.value('usdaKey', 'RJEnADgGbCjfJYi0z8vuVnelYXn2Smud2Dfi2u2F');

app.service('foodInfo', ['$resource', '$http', 'usdaKey',
	function($resource, $http, usdaKey) {

		/*
		var server = $resource('http://api.nal.usda.gov/ndb/search/?format=json', {api_key: usdaKey, query: '@q'}, {
			search: {method: 'GET'}
		});
		*/

		function Food(foodID, quantity, serving, servings, nutrition) {
			this.id = foodID;
			this.quantity = quantity;
			this.serving = serving;
			this.servings = servings;
			this.nutrition = nutrition;
		}

		function Food(food, quantity, serving) {
			this.id = food.ndbno;
			this.quantity = isFinite(quantity) ? quantity : 1;
			this.serving = isFinite(serving) ? serving : 0;
			this.nutrients = food.nutrients;
			//servings map to measures due to API returning null in measures arrays for some foods
			this.servings = _.reduce(food.nutrients[0].measures, function(servings, measure, index) {
				if(measure) {
					servings.push({
						name: _.capitalize(measure.label),
						measure: index,
						weight: measure.eqv
					});
				}
				return servings;
			}, []);

			this.apportion();
		}

		Food.prototype.apportion = function(quantity, serving) {

			var food = this;

			if(isFinite(quantity)) this.quantity = quantity;
			if(isFinite(serving)) this.serving = serving;

			this.nutrition = _.reduce(this.nutrients, function(nutrition, nutrient) {
				nutrition[nutrient.name] = nutrient.measures[food.servings[food.serving].measure].value * food.quantity;
				return nutrition;
			}, {})

			return this;
		}

		var supportedUnits = ['g'];

		var search = function(query) {
			//return server.search({query: query}).$promise;
			return $http.get('http://api.nal.usda.gov/ndb/search/?format=json', {
				cache: true,
				params: {
					api_key: usdaKey,
					q: query
				}
			}).then(function(reply) {
				return reply.data.list.item;
			}, function(error) {
				return [];
			});
		}

		var nutrition = function(foodID, quantity, measure) {
			return $http.get('http://api.nal.usda.gov/ndb/reports/?format=json', {
				params: {
					api_key: usdaKey,
					ndbno: foodID,
					type: 'b'
				}
			}).then(function(reply) {
				var food = reply.data.report.food;

				return new Food(food, quantity, measure);
			});
		}

		return {
			search: search,
			nutrition: nutrition
		}
	}
]);

//app.service()

app.controller('MainCtrl', ['$scope', 'foodInfo',
	function($scope, foodInfo) {

		$scope.search = function(query) {
			return foodInfo.search(query);
		};

		$scope.selectFood = function(foodID) {
			foodInfo.nutrition(foodID).then(function(food) {
				$scope.food = food;
			});
		};

		$scope.name = function(name) {
			name;
		}
	}
]);

app.directive('foodSelector', ['foodInfo', '$timeout',
	function(foodInfo, $timeout) {
		return {
			scope: {output: '=foodSelector'},
			templateUrl: 'public/templates/foodSelector.html',
			link: function(scope, element, attrs) {

				function init() {
					scope.serving = 0;
					scope.quantity = 1;
				}

				init();

				scope.search = function(query) {
					return foodInfo.search(query)
				};
				scope.getInfo = function(reset) {

					if(reset) init();

					if(scope.selectedItem) {
						foodInfo.nutrition(scope.selectedItem.ndbno, scope.quantity, scope.serving).then(function(food) {
							scope.output = food;
							scope.food = food;
						}, function(food) {
							scope.form.food.$error;
						})
					}
				}
			}
		}
	}
]);