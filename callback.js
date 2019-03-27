var params = {};
if (window.location.hash.length > 1) {
  for (var aItKey, nKeyId = 0, aCouples = window.location.hash.substring(1).split("&"); nKeyId < aCouples.length; nKeyId++) {
    aItKey = aCouples[nKeyId].split("=");
    params[decodeURIComponent(aItKey[0])] = aItKey.length > 1 ? decodeURIComponent(aItKey[1]) : "";
  }
}

localStorage.setItem("access_token", params.access_token);
localStorage.setItem("expires_at", Date.now() + params.expires_in * 1000);
window.location.replace("..");