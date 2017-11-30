String.prototype.format = String.prototype.f = function() {
    var s = this, i = arguments.length;
    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

function random(obj) {
    return obj[Math.floor(Math.random() * obj.length)];
}

function getQueryParam(param) {
    var vars = {};
    window.location.href.replace( location.hash, '' ).replace(
        /[?&]+([^=&]+)=?([^&]*)?/gi, // regexp
        function( m, key, value ) { // callback
            vars[key] = value !== undefined ? value : '';
        }
    );

    if ( param ) {
        return vars[param] ? vars[param] : null;
    }
    return vars;
}

function _(text) {
    if (lang_index in i18n) {
        if (text in i18n[lang_index]) {
            return i18n[lang_index][text];
        }
    }
    return text;
}

var status = 0;
/*
   0: Generating round
   1: Round ready to play
   2: Gender ready to guess
*/

var i18n = { };
var idioms = ["EN", "PT", "ES", "IT", "CA", "FR", "RU"];
var genders = {
    "M": "M, М",
    "F": "F, Ф, Ж",
    "N": "N, Н"
};

var split_reg = /, | \/ /g;
var note_reg = /\(([^\)]*)\)/g;
var clean_reg = /[^a-z\u00E0-\u00FCа-я]+/ig;
var normal_reg = /[\u0300-\u036f]/g;
var normal_repl = [
    ["á","a"],["â","a"],["à","a"],["ä","a"],["ã","a"],
    ["é","e"],["ê","e"],["è","e"],["ë","e"],["e","e"],
    ["í","i"],["î","i"],["ì","i"],["ï","i"],
    ["ó","o"],["ô","o"],["ò","o"],["ö","o"],["õ","o"],
    ["ú","u"],["û","u"],["ù","u"],["ü","u"]
];
var repeat_reg = /(.)\1{2,}/g;
var replacements = [["й", "и"], ["ы", "и"], ["щ", "ш"], ["в", "б"], ["ь", ""], ["ъ", ""]];

var storage = null;

function doStart() {
    rounds = 0;
    score = 0.0;
    points = 0;

    lang_index = $("select#selLangIndex option:selected")[0].value;
    lang_focus = [];
    for (num in idioms) {
        idiom = idioms[num];
        if($("input#chk" + idiom)[0].checked) {
            lang_focus.push(idiom);
        }
    }

    var idis_a = lang_focus.join(",");
    Cookies.set("lang", lang_index);
    Cookies.set("list", idis_a);
    if (storage) {
        storage.setItem("lang", lang_index);
        storage.setItem("list", idis_a);
    }

    num = $.inArray(lang_index, lang_focus);
    if (num > -1) {
        lang_focus.splice(num, 1);
    }

    used = [];

    $("div#langTitle")[0].innerHTML = _("Welcome to the Game!");
    $("span#spPlayIn")[0].innerHTML = _("Play in");
    $("span#spWith")[0].innerHTML = _("with");
    $("input#btnPlay")[0].value = _("Play!");
    elem = $("#langResult");
    elem[0].innerHTML = _("Waiting to solve...");
    elem.css("background-color", "lightyellow");
    $("div#langQuestion")[0].innerHTML = _("Waiting for the question");
    $("input#textAnswer")[0].placeholder = _("Answer here...");
    $("a#btnAnswer")[0].innerHTML = _("Solve!");

    doRound();
}

function doRound() {
    status = 0;

    concept = null;
    lang = null;
    sym = null;
    gen = null;

    for (i=0; i < 100; i++) {
        word = random(words);
        langs = Object.keys(word);
        if ($.inArray(lang_index, langs) != -1) {
            concept = word[lang_index][0];
            delete langs[lang_index];
            lang = random(langs).toUpperCase();
            if (lang_focus.length == 0 || ($.inArray(lang, lang_focus) != -1)) {
                pair = concept + "@" + lang;
                if ($.inArray(pair, used) == -1) {
                    used.push(pair);
                    var con = word[lang];
                    sym = con[0];
                    gen = null;
                    gen = null;
                    if (con.length > 1) {
                        gen = con[1];
                    }
                    break;
                }
            }
        }
    }

    var accuracy = 0;
    if (rounds > 0) {
        accuracy = (score / rounds) * 100;
    }
    $("div#langPoints")[0].innerHTML = _("Points {0} Rounds {1} Accuracy {2}%").format(score, rounds, accuracy.toFixed(2));
    rounds += 1;

    var teaser = _("Not enough words!");
    if (sym != null) {
        teaser = _("'{0}' in {1}").format(concept, lang);
        status = 1;
    }
    $("div#langQuestion")[0].innerHTML = teaser;
}

function doClean(text) {
    text = text.replace(note_reg, "").toLowerCase();
    return text.replace(clean_reg, "");
}

function doNormal(text) {
    try {
        text = text.normalize('NFD').replace(normal_reg, "");
    } catch (ex) {
        for (var num in normal_repl) {
            repl = normal_repl[num];
            text = text.replace(repl[0], repl[1])
        }
    }
    for (var num in replacements) {
        replacement = replacements[num];
        text = text.replace(replacement[0], replacement[1])
    }
    return text.replace(repeat_reg, '$1');
}

function doEval(guess, solutions) {
    match = _("WRONG");
    pts = 0;
    col = "lightpink";
    clean_guess = doClean(guess);
    normal_guess = doNormal(clean_guess);
    sols = solutions.split(split_reg);
    for (num in sols) {
        sol = sols[num];
        clean_sol = doClean(sol);
        if (clean_guess == clean_sol) {
            match = _("RIGHT");
            pts = 0.5;
            col = "lightgreen";
            break;
        } else {
            normal_sol = doNormal(clean_sol);
            if (normal_guess == normal_sol) {
                match = _("ALMOST");
                pts = 0.25;
                col = "lightyellow";
            }
        }
    }
    return [match, pts, col];
}

function doSolve() {
    var guess = $("#textAnswer")[0].value;
    $("#textAnswer")[0].value = "";
    if (guess) {
        elem = $("#langResult");
        if (status == 1) {
            var tuple = doEval(guess, sym);
            points = tuple[1];
            elem[0].innerHTML = _("{0}! It is '{1}'").format(tuple[0], sym);
            elem.css("background-color", tuple[2]);
            if (gen != null) {
                $("#langQuestion")[0].innerHTML = _("Which gender is it? [M]asculine, [N]eutral or [F]eminine?");
                status = 2;
            } else {
                points *= 2;
                score += points;
                doRound();
            }
        } else if (status == 2) {
            var tuple = doEval(guess, genders[gen]);
            points += tuple[1];
            elem[0].innerHTML = _("{0}! It is '{1}'").format(tuple[0], gen);
            elem.css("background-color", tuple[2]);
            score += points;
            doRound();
        }
    }
    return false;
}

function doReady() {
    q_params = getQueryParam();
    var idi = null;
    var idis_a = null;
    idi = Cookies.get("lang");
    idis_a = Cookies.get("list");
    if (storage) {
        idi = storage.getItem("lang");
        idis_a = storage.getItem("list");
    }
    if ("lang" in q_params) {
        idi = q_params["lang"];
    }
    if ("list" in q_params) {
        idis_a = q_params["list"];
    }
    if (idi) {
        var sel = $("select#selLangIndex option#sel" + idi.toUpperCase());
        if (sel.length > 0) {
            sel[0].selected = true;
        }
    }
    if (idis_a) {
        var idis = idis_a.toUpperCase().split(",").map(function (el) {
            return "chk" + el
        });
        var checks = $("#chckChoices input");
        for (num in checks) {
            if ($.inArray(checks[num].id, idis) < 0) {
                checks[num].checked = false;
            }
        }
    }
    $.getJSON("res/i18n.json", function (data) {
        i18n = data;
        $.getJSON("langame/langame.json", function (data) {
            words = data;
            doStart();
        })
    });
}