$(document).ready(function() {
    var socket = io();
    var typing = false;
    var timeout = undefined;
    var eggs = ["nyan", "hampsterdance"];
    
    $("#sel form").submit(function() {
        $("#sel").hide();
        $("#msg").show();
        socket.emit(
            "seek",
            $("#gender").val(),
            $("#age").val(),
            $("#seekGender").val(),
            $("#ageFrom").val(),
            $("#ageTo").val()
        );
        return false;
    });

    $("#msg form").submit(function() {
        socket.emit("message", $("#msg input").val());
        var msg = $("#msg input").val();
        if (msg.charAt(0) === "/" && eggs.indexOf(msg.slice(1)) > -1) {
            var egg = msg.slice(1);
            $("#messages").append($("<li>").addClass("ownmsg").prepend("Te: <img src=\"eggs/" + egg + ".gif\" alt=\"" + egg +"\">"));
            if ($("#" + egg).length === 0) {
                $("body").append($("<audio>").prop("src", "eggs/" + egg + ".ogg").prop("id", egg));
            }
            $("#" + egg).trigger("play");
        } else {
            var el = $("<li class=\"ownmsg\">");
            addSmileys(el, "Te: ", msg);
            $("#messages").append(el);
            $("#notify").trigger("play");
        }
        $("#msg input").val("");
        scroll();
        return false;
    });

    $("#msg input").on("keypress", function(e) {
        if (e.keyCode === 13) {
            clearTimeout(timeout);
            typingEnd();
        } else if (typing) {
            clearTimeout(timeout);
            timeout = setTimeout(typingEnd, 1000);
        } else {
            typing = true;
            socket.emit("typing start");
            timeout = setTimeout(typingEnd, 1000);
        }
    });
    
    $("#exit").click(function() {
        $("#messages").empty();
        $("#msg").hide();
        $("#sel").show();
        socket.emit("exit");
    });

    function typingEnd() {
        typing = false;
        socket.emit("typing end");
    }

    socket.on("waiting", function() {
        $("#status").text("Várakozás partnerre...");
    });

    socket.on("found", function(gender, age) {
        $("#status").text("Partnered: " +
            age + " éves " + (gender === "male" ? "férfi" : "nő"));
        $("#messages").append($("<li>").text("Találtunk egy partnert. Partnered egy " +
            age + " éves " + (gender === "male" ? "férfi" : "nő") + ".").addClass("event"));
        $("#msg input").prop("disabled", false);
        $("#send").prop("disabled", false);
        $("#notify").trigger("play");
    });

    socket.on("message", function(msg) {
        var el = $("<li class=\"partnermsg\">");
        addSmileys(el, "Partnered: ", msg);
        $("#messages").append(el);
        $("#notify").trigger("play");
        scroll();
    });
    
    socket.on("egg", function(egg) {
        $("#messages").append($("<li>").addClass("partnermsg").prepend("Partnered: <img src=\"eggs/" + egg + ".gif\" alt=\"" + egg +"\">"));
        if ($("#" + egg).length === 0) {
            $("body").append($("<audio>").prop("src", "eggs/" + egg + ".ogg").prop("id", egg));
        }
        $("#" + egg).trigger("play");
        scroll();
    });

    socket.on("typing start", function() {
        $("#messages").append($("<li>").text("Partnered gépel...").addClass("event typing"));
        scroll();
    });

    socket.on("typing end", function() {
        $(".typing").remove();
    });

    socket.on("logout", function() {
        $("#messages").append($("<li>").text("Partnered kilépett.").addClass("event"));
        $("#status").text("Partnered kilépett");
        $("#msg input").prop("disabled", true);
        $("#send").prop("disabled", true);
        scroll();
    });
});

function scroll() {
    $("#messages").stop();
    $("#messages").animate({scrollTop: $("#messages").height()}, "slow");
}

function addSmileys(el, prefix, msg) {
    var smileys = {
      ":)": "smiling",
      ":(": "frowning",
      ":D": "grinning",
      ";)": "winking",
      ":P": "tongue_out",
      ":'(": "crying",
      "<3": "heart",
      ":*": "kissing"
    };
    var smileysArr = Object.keys(smileys);

    el.append(prefix);
    var arr = smileyReplace(msg, 0);
    
    for (var i = 0; i < arr.length; i++) {
        el.append(arr[i]);
    }
    
    function smileyReplace(str, si) {
        // TODO skip empty strings
        // TODO don't splice (take out and re-add) if the array contains only one element
        if (si === smileysArr.length) {
            return [document.createTextNode(str)];
        } else {
            var strArr = str.split(smileysArr[si]);
            var i = 0;
            while (i < strArr.length) {
                var dom = smileyReplace(strArr[i], si + 1);
                strArr.splice(i, 1);
                for (var j = 0; j < dom.length; j++) {
                    strArr.splice(i, 0, dom[j]);
                    i++;
                }
                if (i < strArr.length) {
                    strArr.splice(i, 0, $("<img alt=\"" + smileysArr[si] + "\" src=\"smileys/" + smileys[smileysArr[si]] + ".png\">"));
                    i++;
                }
            }
            return strArr;
        }
    }
}
