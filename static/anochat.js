$(document).ready(function() {
    var socket = io();
    var typing = false;
    var timeout = undefined;

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
        $("#messages").append($("<li>").text("Te: " + $("#msg input").val()).addClass("ownmsg"));
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
        scroll();
        $("#messages").append($("<li>").text("Partnered: " + msg).addClass("partnermsg"));
        $("#notify").trigger("play");
    });

    socket.on("typing start", function() {
        scroll();
        $("#messages").append($("<li>").text("Partnered gépel...").addClass("event typing"));
    });

    socket.on("typing end", function() {
        $(".typing").remove();
    });

    socket.on("logout", function() {
        scroll();
        $("#messages").append($("<li>").text("Partnered kilépett.").addClass("event"));
        $("#status").text("Partnered kilépett");
        $("#msg input").prop("disabled", true);
        $("#send").prop("disabled", true);
    });
});

function scroll() {
    //$("#messages").animate({scrollTop: $("#messages").height()}, "slow");
}