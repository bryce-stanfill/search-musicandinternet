var app = angular.module("app", ["ngStorage", "ngRoute"]);

const numResults = 10; // numResults per page

// toggle switch for google and lyric searching
app.controller("swap-controller", function($scope, $http){
    // if false, google searching, else searching through lyrics
    $scope.state = false;
    $scope.message = "Song Searching";
    this.oldQuery = "";

    // for the color of clicking the button
    let originalColor = document.getElementById("swap-button").style.backgroundColor;
    $scope.swap = function(event){
        let img = document.querySelector("#content_container img");
        document.getElementById("swap-button").style.backgroundColor = "#1c0603";
        if(!$scope.state){
            img.src = "../static/media/music_notes.png";
            img.alt = "web-search";
            $scope.message = "Google Searching";
            $scope.state = true;
            document.querySelector("footer p").innerHTML="";
        }
        else{
            $scope.message = "Song Searching";
            $scope.state = false;
            img.src = "../static/media/goggle_anim.gif";
            img.alt = "song-searching";
            document.querySelector("footer p").innerHTML="Note: Made with Google Custom Search API";
        }
        // empty the search bar
        $scope.value = "";
        
        setTimeout(() => document.getElementById("swap-button").style.backgroundColor = originalColor,
        250);
    }

    $scope.search = function(event){
        $scope.value = document.getElementById("search_bar").value;
        if(event.which == 13 || event.type === "click" && $scope.value){
            if($scope.value != this.oldQuery){
                this.oldQuery = $scope.value;
            }
            $http.post("/search", {"value" : $scope.value, "value2" : $scope.state, "num" : numResults})
            .then(function(response){
              window.location.href = response.data.url;

            })   
            .catch(function(response){
                alert(`something went wrong status code: ${response.status}`);
            })
        }
    }
});



