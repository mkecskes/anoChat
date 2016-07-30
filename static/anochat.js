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
        if (msg.charAt(0) === "/" && eggs.includes(msg.slice(1))) {
            var egg = msg.slice(1);
            $("#messages").append($("<li>").addClass("ownmsg").prepend("Te: <img src=\"eggs/" + egg + ".gif\" alt=\"" + egg +"\">"));
            if ($("#" + egg).length === 0) {
                $("body").append($("<audio>").prop("src", "eggs/" + egg + ".ogg").prop("id", egg));
            }
            $("#" + egg).trigger("play");
        } else {
            $("#messages").append($("<li>").text("Te: " + msg).addClass("ownmsg"));
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
        $("#messages").append($("<li>").text("Partnered: " + msg).addClass("partnermsg"));
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
    //$("#messages").animate({scrollTop: $("#messages").height()}, "slow");
}
