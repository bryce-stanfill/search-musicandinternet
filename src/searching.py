import pandas as pd
from urllib.parse import quote
from flask import Flask, render_template, request, jsonify
import pysolr
import math
# stores api keys and password for website in environment variables for security purposes
from dotenv import load_dotenv
import os
import requests

load_dotenv('keys.env')

# settings for pandas module displaying
# number of cols in csv file
pd.options.display.max_columns = 6
# arbitrary amount of rows to be displayed
pd.options.display.max_rows = 15

app = Flask(__name__, template_folder="../templates", static_folder="../static")
solrInstance = pysolr.Solr("http://localhost:8983/solr/core1")

# csv file to parse(character encoding is cp1252, not UTF-8)
df = pd.read_csv("lyrics.csv", encoding="cp1252")

attributes = ["Rank", "Song", "Artist", "Year", "Lyrics", "Source"]

results = []

snippets = []

# default to 10
numContentPerPage = 10
numPages = 0

# delete everything due to consecutive executions of the program and to prevent
# other accidental data that is inserted otherwise to be included in search results
removeEntries = solrInstance.search("*:*")
if(removeEntries.hits > 0):
    solrInstance.delete(q= "*:*")
    solrInstance.commit()

# dropping rows that have a null/nil/NA value for one of their attributes
# also create a list of dictionaries that display attribute and value pairs 
# row by row

# remove entries with 2 or more spaces
modifiedDfDictList = df.dropna().to_dict(orient='records')

if(modifiedDfDictList):
    solrInstance.add(modifiedDfDictList)
    solrInstance.commit()


@app.route("/getPassword", methods=["POST"])
def password():
    entry = request.json["entry"]
    realPassword = os.getenv('website_password')
    # return type cannot be a bool for the view function
    return "y" if entry == realPassword else "n"
    

@app.route("/getParsedResults", methods=["POST"])
def getParsedResults():
    global numPages
    parsedResults = iterateThroughTable(int(request.json["pageNum"]))
    return jsonify({"parsedResults" : parsedResults, "numPages": numPages, "numResults" : len(results),
                    "snippets": snippets})

@app.route("/apikey", methods=["POST"])
def getLink():
    # retrieve the google custom search engine api key and then
    # pass it back to javascript to find the results with the returned link
    global numContentPerPage
    query = request.json["query"]
    pageNum = request.json["currentPage"]
    numContentPerPage = request.json["numContent"]
    imgFlag = request.json["imageFlag"]

    # google search api
    apiKey = os.getenv('google_cse_apiKey')
    searchKey = os.getenv('google_cse_configKey')

    bingAPIKey =  os.getenv('bing_imageSearch_apiKey')
    bingSearchKey = os.getenv('bing_imageSearch_configKey')


    
    # 10 results per page, starting on page 1, images have 15 results per page
    if(not imgFlag):
        url = (f"https://www.googleapis.com/customsearch/v1?q={query}"
            f"&key={apiKey}&cx={searchKey}&start={(numContentPerPage * (pageNum - 1) + 1)}"
            f"&num={numContentPerPage}")

        response = requests.get(url)

    # retrieve only image content 
    else:
        headers = {
            "Ocp-Apim-Subscription-Key": bingAPIKey,
            "customConfig" : bingSearchKey
        }
        url = (f"https://api.bing.microsoft.com/v7.0/images/search?q={query}"
                f"&count={numContentPerPage}&license=Share&offset={numContentPerPage * (pageNum - 1)}")

        response = requests.get(url, headers=headers)
        
    return response.json()

# when the user clicks the paginator, an http post request is sent that includes
# the current page num, and numResults per page to be displayed, defaulted back
# to page 1 if new query
def iterateThroughTable(num = 1):
    global numContentPerPage, numPages
    parsedResults = []
    
    numPages = math.ceil(len(results) / numContentPerPage)
    # interval for indexing and partitioning results: 
    # [numResultsPerPage(pageNum - 1), numResultsPerPage(pageNum))
    # iterate 10 times from numResultsPerPage(pageNum - 1) + i to numResultsPerPage(pageNum)
    if num <= numPages:
        for i in range(numContentPerPage):
            index = numContentPerPage * (num - 1) + i
            if results and index < len(results):
                # remove brackets from values 
                subResult = dict(results[index])
                subDict = {k:str(v).strip("[]") for k,v in subResult.items()}
                parsedResults.append(subDict)
            else:
                break

    return parsedResults

def buildTable(query) -> list:
    global results, snippets
    results = []
    snippets = []

    properties = {
        # return number of rows in modified csv dataframe instead of default 10
        "rows": len(modifiedDfDictList),
        "fl": "Rank, Artist, Song, Lyrics, Year",
        "q.op": "AND",
        "hl": "true",
        "tie": 0.1,
        "hl.fl": "Lyrics, Song, Artist, Year",
        "hl.boundaryScanner" :  "breakIterator",
        "hl.fragsize" : 40, 
        "hl.snippets" : 1, 
        "defType" : "dismax",  # allows for keyword searching without using lucene syntax
        "qf" : {
            "Rank" : 1.3,
            "Artist" : 1,
            "Song" : 1,
            "Lyrics" : 1,
            "Year" : 1
        }, 
        "sort" : "Rank desc"
    }

    searchResults = solrInstance.search(f"{query}", **properties)
    highlights = list(dict(searchResults.highlighting).values())

    # retrieve the highlighted content from Solr
    for highlight in highlights:
        snippets.append(list(dict(highlight).values())[0])

    return searchResults.docs


@app.route("/songresults/q=<query>", methods=["GET"])
def songResults(query):
    global numContentPerPage
    # reset back to 10 entries for song table
    numContentPerPage = 10
    # search button was pressed, refresh for new query
    global results
    results = buildTable(query)
    return render_template("songResults.html", query=query)
    

@app.route("/webresults/q=<query>", methods=["GET"])
def webResults(query):
    return render_template("results.html", query=query)

@app.route("/search", methods=["GET", "POST"])
def main():
    # starting page
    if request.method == "GET":
        return render_template("search.html")
    else:
        global numContentPerPage
        query = request.json["value"]
        flag = request.json["value2"]
        value = request.json["num"]
        # for some reason, there is an issue extracting the json value to a global variable
        numContentPerPage = value
        if flag:
            url = "/songresults/q="
            url += query
        else:
            url = "/webresults/q="
            url += quote(query)
        
        return jsonify({'url': url})

@app.errorhandler(404)
def errorHandler(error):
    return render_template("notFound.html")

if __name__ == '__main__':
    app.run(host="localhost", port=80, debug=True)