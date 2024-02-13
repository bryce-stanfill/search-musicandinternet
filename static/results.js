var app = angular.module("resultsApp", ["ngStorage", "ngRoute"]);

var pageNum = 1;
const numResults = 10; // numResults per page
const NumResultsImages = 15; // num images per page cap is 150
var numPages = 0 /* initially 0 as a query has not been entered
                  number of pages = Math.ceil(numberSearchResults / numResults) */



app.controller("searchResult", function($scope, $localStorage, $window, $http){
    var img = document.querySelector("img");
    let paginator = document.querySelectorAll(".custom-paginator button");
    $scope.query = document.querySelector("#search_bar").placeholder;
    let oldQuery = $scope.query;

    $scope.state;

    if(img.src === "http://localhost/static/media/music_notes.png"){
        $scope.state = true;
    }
    else{
        $scope.state = false;
    }

    // load pageNum if there is a pageNum saved in localStorage only on web searching
    if(JSON.parse(localStorage.getItem("pageNum")) && !$scope.state){
        pageNum = parseInt(localStorage.getItem("pageNum"));
    
        // numeric paginator label indexes, update numeric and activated labels
        for(i = 1; i < paginator.length - 1; ++i){
            paginator[i].classList.remove("activated")
            if(pageNum === parseInt(paginator[i].innerHTML)){
                paginator[i].classList.add("activated");
            }

            paginator[i].innerHTML = parseInt(paginator[paginator.length - 2].innerHTML) - (paginator.length - 2) + i;

        }
    }
    
    $scope.tabOptions = document.querySelectorAll(".options button");
    $scope.currentTab = $scope.tabOptions[0];


    $scope.createTable = function(results, contentContainer, snippets){
        table = document.createElement("table");
        table.classList.add("table", "table-bordered");
        table.style.color = "aliceblue";
        
        thead = document.createElement("thead");
        // label headings from list of dictionaries to table
        
        Object.keys(results[0]).forEach(label => {
            heading = document.createElement("th");
            heading.innerHTML = label;
            thead.appendChild(heading);
        });

        table.appendChild(thead);

        for(i = 0; i < results.length; ++i){
            let row = document.createElement("tr");
            Object.keys(results[0]).forEach(key => {
                var tableData = document.createElement("td");
                if(key === "Lyrics"){
                    // start long chain of create elements and setting attributes
                    // to create bootstrap modal entry for lyrics cell, could have also just used innerHTML inside of the contentContainer

                    // modal heading text
                    let modalHeadingText = document.createElement("h5");
                    modalHeadingText.classList.add("modal-title");
                    modalHeadingText.setAttribute('id', 'staticBackdropLabel');
                    modalHeadingText.innerHTML = `${results[i]["Song"]} by: ${results[i]["Artist"]}`;

                    let closeButton = document.createElement("button");
                    closeButton.setAttribute('type', 'button');
                    closeButton.classList.add("btn-close");
                    closeButton.setAttribute('data-bs-dismiss', 'modal');
                    closeButton.setAttribute('aria-label', "Close");

                    let modalBody = document.createElement("div");
                    modalBody.classList.add("modal-body");
                    modalBody.innerHTML = results[i]["Lyrics"];

                    let modalFooter = document.createElement("div");
                    modalFooter.classList.add("modal-footer");


                    let modalFooterButton = document.createElement("button");
                    modalFooterButton.classList.add("btn", "btn-secondary");
                    modalFooterButton.setAttribute('type', 'button');
                    modalFooterButton.setAttribute('data-bs-dismiss', 'modal');
                    modalFooterButton.innerHTML = "Close";

                    let modalHeading = document.createElement("div");
                    modalHeading.classList.add("modal-header");

                    // modal button container
                    let modalButtonContainer = document.createElement("div");
                    modalButtonContainer.classList.add("modal-button-inactive");

                    // modal initialization button
                    let modalButton = document.createElement("button");
                    modalButton.innerHTML = "lyrics";
                    modalButton.setAttribute('type', 'button');
                    modalButton.classList.add("btn", "btn-secondary");
                    modalButton.setAttribute('data-bs-toggle', 'modal');
                    modalButton.setAttribute('data-bs-target', `#Modal${i + 1}`);

                    modalButtonContainer.appendChild(modalButton);

                    /*small snippet text(maximum of 40 characters for formatting and spacing)
                     create snippet text below each modal button */
                    snippetText = document.createElement("p");
                    snippetText.innerHTML = snippets[i][0];
                    modalButtonContainer.appendChild(snippetText);

                    // modal that holds the content and header
                    var mainModal = document.createElement("div");
                    mainModal.classList.add("modal", "fade");
                    mainModal.setAttribute('id', `Modal${i + 1}`);
                    mainModal.setAttribute('data-bs-backdrop', 'static');
                    mainModal.setAttribute('tabindex', '-1');
                    mainModal.setAttribute('aria-labelledby', 'staticBackdropLabel');
                    mainModal.setAttribute('aria-hidden', 'true');
                    mainModal.style.color = "black";

                    let modalDialogue = document.createElement("div");
                    modalDialogue.classList.add("modal-dialog");

                    // main content inside the modal
                    let modalContent = document.createElement("div");
                    modalContent.classList.add("modal-content");

                    // start attaching children to their appropriate containers
                    modalFooter.appendChild(modalFooterButton);
                    modalHeading.appendChild(modalHeadingText);
                    modalHeading.appendChild(closeButton);

                    modalContent.appendChild(modalHeading);
                    modalContent.appendChild(modalBody);
                    modalContent.appendChild(modalFooter);

                    modalDialogue.appendChild(modalContent);

                    mainModal.appendChild(modalDialogue);

                    modalButtonContainer.appendChild(mainModal);

                    tableData.appendChild(modalButtonContainer);
                }
                else{
                    tableData.innerHTML = results[i][key];
                }

                row.appendChild(tableData);
                table.appendChild(row);


            })
        }

        // add final table to container
        contentContainer.appendChild(table);
        
    }

    $scope.showResults = function(){
        // show music results based off of the query
        if($scope.state){
            let results, snippets;
            let contentContainer = document.querySelector(".table-results");
            contentContainer.innerHTML = "";
            // flask handles generating the song content off of the query
            $http.post("/getParsedResults", {"pageNum" : pageNum})
            .then(function(response){
                numPages = response.data.numPages;
                // list of dictionaries of the results returned
                results = response.data.parsedResults;
                snippets = response.data.snippets;
                if(results.length > 0){
                    contentContainer.innerHTML += "<p>" + "Number of results: " + 
                             + response.data.numResults + " results" + 
                            ' for: "' + $scope.query + '"</p>';
                    $scope.createTable(results, contentContainer, snippets);
                }
                else{
                    contentContainer.innerHTML += "<p>" + "No results found for the query: " + $scope.query  +
                            "</p>";
                }
            });
        }
        // show web results based off of the query using google custom search api
        else{
            let content = numResults;
            // get the api key from the server, which is produced by flask
            if($scope.currentTab.innerHTML === $scope.tabOptions[1].innerHTML){
                content = NumResultsImages;
            }
            let imageFlag = false;
            if($scope.tabOptions[1].className === "active"){
                imageFlag = true;
            }
            
            if(!imageFlag){
                $http.post("/apikey", {"query" : $scope.query, "currentPage": pageNum, 
                "numContent" : content, "imageFlag" : imageFlag})
                .then(function(response){
                    let searchResults = response.data.items;
                    let searchResultContainer = document.querySelector(".searchResults");
                    searchResultContainer.innerHTML = "";
                    searchResultContainer.style = "";
                    /* change the display format to grid on searchContainer if 
                     image searching, otherwise display flexbox in a column format */
                    searchResultContainer.style.display = "flex";
                    searchResultContainer.style.flexDirection = "column";
                     
                    numPages = Math.ceil(parseInt(response.data.searchInformation.totalResults) / content);
                    if(searchResults &&  $scope.currentTab.innerHTML === $scope.tabOptions[0].innerHTML){
                        searchResultContainer.innerHTML += "<p>" + "Number of results: " + 
                            response.data.searchInformation.formattedTotalResults + " results" + "(" + response.data.searchInformation.formattedSearchTime + " secs)" 
                            + ' for: "' + $scope.query + '"</p>';

                        searchResults.forEach(element => {
                            let link = document.createElement("a");
                            link.href = element["link"];
                            link.innerHTML = element["title"];
                            searchResultContainer.appendChild(link);
                            searchResultContainer.innerHTML += `<p> ${element["snippet"]} </p>`;
                        });
                    }
                    else{
                        searchResultContainer.innerHTML += "<p>" + "No results found for the query: " + $scope.query  +
                        "</p>";
                    } 
                })} 
            
                
            
            // image searching using bing image search api
            else{
                $http.post("/apikey", {"query" : $scope.query, "currentPage": pageNum, 
                "numContent" : content, "imageFlag" : imageFlag})
                .then(function(response){
                    let searchResultContainer = document.querySelector(".searchResults");
                    searchResultContainer.innerHTML = "";
                    searchResultContainer.style = "";
                    let searchResults = response.data.value
                    searchResultContainer.style.display = "grid";
                    // 5 columns, all of equal width and height
                    searchResultContainer.style.gridTemplateColumns = "auto auto auto auto auto";
                    searchResultContainer.style.gap = "15px";
                    searchResultContainer.style.gridAutoRows = "minmax(50px, auto)";
                    
                    numPages = Math.ceil(response.data.totalEstimatedMatches / content)

                    // process images when image tag is active
                    if(searchResults && $scope.currentTab.innerHTML === $scope.tabOptions[1].innerHTML){
                        // generate images from the api based on query
                        searchResults.forEach(item => {
                            const img = new Image();
                            img.src = item.contentUrl;
                            img.alt = $scope.query;
                            searchResultContainer.appendChild(img);
                        })
                    }
                    else{
                        searchResultContainer.innerHTML += "<p>" + "No results found for the query: " + $scope.query  +
                        "</p>";
                        numPages = 0;
                    } 
             }) 
            }

        } 
    };

    $scope.search = function(event){
        $scope.value = document.getElementById("search_bar").value;
        if($scope.value && (event.which == 13 || event.type === "click")){
            if($scope.value != oldQuery){
                oldQuery = $scope.value;
            }
            $http.post("/search", {"value" : $scope.value, "value2" : $scope.state,
            "num" : numResults})
            .then(function(response){
              window.location.href = response.data.url;
            })   
            .catch(function(response){
                alert(`something went wrong status code: ${response.status}`);
            })

            // update address bar, so that the query is formatted correctly
            
            $scope.resetPaginator();
            $scope.showResults();
            
        }
    }

    // go back to page 1 on tab switch 
    $scope.resetPaginator = function(){
        for(i = 1; i < paginator.length - 1; ++i){
            if(i == 1){
                paginator[i].classList.add("activated");
            }
            else{
                paginator[i].classList.remove("activated");
            }
            paginator[i].innerHTML = i;
        }

        pageNum = 1;
    }

    $scope.paginatorClicked = function(event){
        // determine what button was pressed on the paginator
        let paginatorButtonLabel = event.target.innerHTML;
        let anchorTagContainer = document.querySelectorAll(".custom-paginator button");

        // the button pressed was either the forward or backward button(<< or >> respectively)
        if(isNaN(parseInt(paginatorButtonLabel))){
            if(paginatorButtonLabel === anchorTagContainer[0].innerHTML){
                // check to see if the active paginator page is the first one listed, if it is, modify all
                // page numbers labels else do nothing
                if(paginator[1].className === "activated" && pageNum > 1){
                    // activate last numeric block, deactivate others
                    for(let i = 0; i < paginator.length; ++i){
                        if(i == paginator.length - 2){
                            // activate
                            paginator[i].classList.add("activated");
                        }
                        else{
                            paginator[i].classList.remove("activated");
                        }
                        // decrements for the next set of page numbers listed
                        if(!isNaN(parseInt(paginator[i].innerHTML))){
                            let num = parseInt(paginator[i].innerHTML);
                            paginator[i].innerHTML = num - 5;
                        }
                    }
                }
                else{
                    let index = Array.prototype.findIndex.call(paginator, function(element){
                        return element.className === "activated";
                    });
                    if(index > 1){
                        paginator[index].classList.remove("activated");
                        paginator[--index].classList.add("activated");
                    }
                }
                
                if(pageNum > 1){
                    pageNum--;
                }

            }
            else if(paginatorButtonLabel === paginator[6].innerHTML){
                if(paginator[5].className === "activated" && pageNum < numPages){
                    // activate last numeric block, deactivate others
                    for(let i = 0; i < paginator.length; ++i){
                        if(i > 1){
                            // deactivate
                            paginator[i].classList.remove("activated");
                        }
                        else if(i == 1){
                            paginator[i].classList.add("activated");
                        }
                        // increments for the next set of page numbers listed
                        if(!isNaN(parseInt(paginator[i].innerHTML))){
                            let num = parseInt(paginator[i].innerHTML);
                            paginator[i].innerHTML = num + 5;
                        }
                    }
                }
                else{
                    let index = Array.prototype.findIndex.call(paginator, function(element){
                        return element.className === "activated";
                    });
                    if(index < paginator.length - 2 && pageNum + 1 <= numPages){
                        paginator[index].classList.remove("activated");
                        paginator[++index].classList.add("activated");
                    }
                }

                if(pageNum < numPages){
                    pageNum++;
                }
            }
        }
        // the button pressed was a numeric label
        else{
            if(pageNum <= numPages && pageNum > 0 && paginatorButtonLabel < numPages){
                pageNum = parseInt(paginatorButtonLabel);
                activeTag = document.querySelector("button.activated");
                if(activeTag){
                    activeTag.classList.remove("activated");
                }
                event.target.classList.add("activated");
            }
           
       }
       $scope.showResults();  
    }

    $scope.tabMode = function(event){
        // get the tab that was clicked
        $scope.currentTab = event.target;
        $scope.tabOptions.forEach(element =>{
            if($scope.currentTab.innerHTML != element.innerHTML){
                element.classList.remove("active");
            }
            else{
                $scope.currentTab.classList.add("active");
            }
        });

        pageNum = 1;

        $scope.resetPaginator();
        $scope.showResults();

    }

    // before user clicks off the page, save the pageNum in localStorage
    window.addEventListener("beforeunload", function(event){
        localStorage.setItem("pageNum", JSON.stringify(pageNum));
    })

    $scope.showResults();

});