const CLIENT_ID = "1037496644275-0ueocdgloa5q3a31sqjoi5aaugkrjq7a.apps.googleusercontent.com";
const REDIRECT_URI = "https://roadcrosser.xyz/spindle/callback";
const RESPONSE_TYPE = "token";
const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

const OAUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth\
?client_id=${encodeURIComponent(CLIENT_ID)}\
&redirect_uri=${encodeURIComponent(REDIRECT_URI)}\
&response_type=${RESPONSE_TYPE}\
&scope=${encodeURIComponent(SCOPE)}`;

let token = localStorage.getItem("access_token");
if (!token || (Date.now() / 1000) > parseFloat(localStorage.getItem("expires_at"))){
    window.location.replace(OAUTH_URL);
}

const SUBSCRIPTIONS_URL = `https://www.googleapis.com/youtube/v3/subscriptions?access_token=${token}&part=snippet&mine=true&maxResults=50`
const FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=";

class Video {
    constructor(id, title, channelname, channelid, views, ratings, ts) {
        this.id = id;
        this.title = title;
        this.channel = channelname;
        this.channelid = channelid;
        this.views = views;
        this.ratings = ratings;
        this.ts = Date.parse(ts);
    }

    get_ts() {
        return this.ts;
    }
    
    get_thumbnail() {
        return `https://img.youtube.com/vi/${this.id}/mqdefault.jpg`;
    }
    
    get_url() {
        return `https://www.youtube.com/watch?v=${this.id}`;
    }
    
    calculate_readable_diff(now) {
        let delta = Math.abs(this.ts - now) / 1000;
        
        let days = Math.floor(delta / 86400);
        delta -= days * 86400;
        
        let hours = Math.floor(delta / 3600) % 24;
        delta -= hours * 3600;
        
        let minutes = Math.floor(delta / 60) % 60;
        delta -= minutes * 60;
        
        let seconds = delta % 60;
        
        let ret = "";

        if (!days){
            if (!hours){
                if (!minutes){
                    ret = `${seconds} second${s_logic(seconds)}`;
                } else {
                    ret = `${minutes} minute${s_logic(minutes)}`;
                }
            } else {
                ret = `${hours} hour${s_logic(hours)}`;
            }
        } else {
            if (days >= 30){
                let months = Math.floor(days / 30);
                if (months >= 12) {
                    let years = Math.floor(months / 12);
                    ret = `${years} year${s_logic(years)}`;
                } else {
                    ret = `${months} month${s_logic(months)}`;
                }
            } else {
                ret = `${days} day${s_logic(days)}`;
            }
        }
        
        ret += " ago";
        return ret;
    }
    
    get_channel_url() {
        return `https://www.youtube.com/channel/${this.channelid}`;
    }
    
    as_block(now) {
        let ret = $("<div></div>").addClass("col feeditem p-0");
        ret.append(
            $("<a></a>").attr("href", this.get_url()
        ).append(
            $("<img></img>"
            ).attr("src", this.get_thumbnail()
            ).attr("title", this.title
            ).addClass("feedthumb")
                )
            );
        
        ret.append(
            $("<div></div>").addClass("px-1 mt-1").append(
                $("<div></div>").append(
                    $("<a></a>").attr("href", this.get_url()).addClass("font-weight-bold videolink").text(this.title)
                    )
                ).append(
                $("<div></div>").append(
                    $("<a></a>").attr("href", this.get_channel_url()).addClass("undertext").text(this.channel)
                    )
                ).append(
                $("<div></div>").addClass("undertext").append(
                    this.calculate_readable_diff(now)
                    )
                )
            );
        
        return ret;
    }
}

function s_logic(num){
    return num != 1 ? "s" : "";
}

let channel_ids = [];
let all_videos = [];

function get_all_channels(token){
    let get_url = SUBSCRIPTIONS_URL;
    if (token) {
        get_url += "&pageToken=" + token;
    }

    $.ajax({
        type: "GET",
        url: get_url,
        data: {
          channelid: i  
        },
        dataType: "json",
        success: function(data, status) {
            for (let i of data.items){
                channel_ids.push(i.snippet.channelId);
            }
            if (data.hasOwnProperty("nextPageToken")){
                get_all_channels(data.nextPageToken);
                return;
            }
            get_videos();
        },
        error: function() {
            alert("There was an error with your token or YouTube.\nRedirecting to login...");
            window.location.replace(OAUTH_URL);
        }
        });
}

function get_videos() {
    for (let i of channel_ids){
        $.ajax({
            type: "GET",
            url: FEED_URL + i,
            dataType: "xml",
            success: function(data) {
                let channel_name = data.getElementsByTagName("title")[0].textContent;

                data.getElementsByTagName("entry").forEach(function(key) {
                    let v_id = key.getElementsByTagName("yt:videoId")[0].textContent;
                    let v_title = key.getElementsByTagName("title")[0].textContent;
                    let v_views = parseInt(key.getElementsByTagName("media:statistics")[0].getAttribute("views"));
                    let v_ratings = calculate_ratings(key.getElementsByTagName("media:starRating")[0]);
                    let v_timestamp = key.getElementsByTagName("published")[0].textContent;

                    all_videos.push(new Video(v_id, v_title, channel_name, i, v_views, v_ratings, v_timestamp));
                    push_feed();
                });
            },
        });
    }
}

function calculate_ratings(tag){
    if (tag.getAttribute("count") == "0"){
        return null;
    }

    let average = parseFloat(tag.getAttribute("average"));
    let min = parseInt(tag.getAttribute("min"))
    let max = parseInt(tag.getAttribute("max"))

    return (average-min) / (max-min);
}


function push_feed(no_data=false){
    let now = Date.now();
    $("#feed").empty();
    
    if (no_data){
        $("#feed").append($("<div></div>").addClass("col").text("No videos found."));
        return;
    }
    let sorted_videos = all_videos.slice().sort((a, b) => a.get_ts() - b.get_ts());
    sorted_videos.reverse();
    
    for (let i of sorted_videos){
       $("#feed").append(i.as_block(now));
    }
}