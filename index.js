var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static("static"));

var socketMap = {};
var eggs = ["nyan", "hampsterdance"];

io.on("connection", function(socket) {
    socket.on("seek", function(gender, age, seekGender, ageFrom, ageTo) {
        var partnerId = seekPartner(socket.id, gender, age, seekGender, ageFrom, ageTo);
        if (partnerId) {
            socket.emit("found", socketMap[partnerId].gender, socketMap[partnerId].age);
            socket.broadcast.to(partnerId).emit("found", gender, age);
        } else {
            socket.emit("waiting");
            newPartner(socket.id, gender, age, seekGender, ageFrom, ageTo);
        }
    });
    
    socket.on("exit", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("logout");
            socketMap[partnerId].currentPartner = "closed";
        });
        delete socketMap[socket.id];
    });
    
    socket.on("disconnect", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("logout");
            socketMap[partnerId].currentPartner = "closed";
        });
        delete socketMap[socket.id];
    });
    
    socket.on("message", function(msg) {
        withPartner(socket.id, function(partnerId, msg) {
            if (msg.charAt(0) === "/" && eggs.indexOf(msg.slice(1)) > -1) {
                socket.broadcast.to(partnerId).emit("egg", msg.slice(1));
            } else {
                socket.broadcast.to(partnerId).emit("message", msg);
            }
        }, msg);
    });
    
    socket.on("typing start", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("typing start");
        });
    });
    
    socket.on("typing end", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("typing end");
        });
    });
});

http.listen(process.env.PORT || 8080);

function seekPartner(id, gender, age, seekGender, ageFrom, ageTo) {
    for (var partnerId in socketMap) {
        var partner = socketMap[partnerId];
        if (
            partner.currentPartner === null &&
            (seekGender === "both" || partner.gender === seekGender) &&
            partner.age >= ageFrom &&
            partner.age <= ageTo &&
            (partner.seekGender === "both" || partner.seekGender === gender) &&
            partner.ageFrom <= age &&
            partner.ageTo >= age
        ) {
            partner.currentPartner = id;
            socketMap[id] = {currentPartner: partnerId};
            return partnerId;
        }
    }
    return false;
}

function newPartner(id, gender, age, seekGender, ageFrom, ageTo) {
    socketMap[id] = {
        currentPartner: null,
        gender: gender,
        age: age,
        seekGender: seekGender,
        ageFrom: ageFrom,
        ageTo: ageTo
    };
}

function withPartner(socketId, callback, msg) {
    if (socketMap[socketId] && socketMap[socketId].currentPartner && socketMap[socketId].currentPartner !== "closed") {
        callback(socketMap[socketId].currentPartner, msg);
    }
}