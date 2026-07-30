/* Lawvy — demo booking flow.
   Slots are defined once in IST (the team's working day) and rendered as real
   instants, so whatever timezone the visitor picks shows the same meeting. */
(function () {
  "use strict";

  var DURATION_MIN = 30;
  var IST_OFFSET_MIN = 330;            // UTC+5:30, and India has no DST
  var DAY_START = 9, DAY_END = 18;     // 09:00–18:00 IST
  var TO = "hello@lawvy.tech";

  var $ = function (id) { return document.getElementById(id); };

  /* ── state ─────────────────────────────────── */
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  var view = new Date(); view.setDate(1);
  var selDate = null;   // {y,m,d} in IST calendar terms
  var selStart = null;  // Date (real instant)

  /* ── helpers ───────────────────────────────── */
  // a slot's true instant: IST wall-clock minus the IST offset
  function instant(y, m, d, h, min) {
    return new Date(Date.UTC(y, m, d, h, min) - IST_OFFSET_MIN * 60000);
  }
  function fmt(date, opts) {
    return new Intl.DateTimeFormat(undefined, Object.assign({ timeZone: tz }, opts)).format(date);
  }
  function timeLabel(d) { return fmt(d, { hour: "numeric", minute: "2-digit" }); }
  function dateLabel(d) { return fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

  /* ── timezone select ───────────────────────── */
  var tzSel = $("tz");
  var zones;
  try { zones = Intl.supportedValuesOf("timeZone"); } catch (e) { zones = []; }
  if (!zones.length) {
    zones = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "Europe/Berlin",
             "America/New_York", "America/Chicago", "America/Los_Angeles",
             "Asia/Singapore", "Australia/Sydney", "UTC"];
  }
  if (zones.indexOf(tz) === -1) zones.unshift(tz);
  zones.forEach(function (z) {
    var o = document.createElement("option");
    o.value = z; o.textContent = z.replace(/_/g, " ");
    if (z === tz) o.selected = true;
    tzSel.appendChild(o);
  });
  $("tzEcho").textContent = tz.replace(/_/g, " ");

  tzSel.addEventListener("change", function () {
    tz = tzSel.value;
    $("tzEcho").textContent = tz.replace(/_/g, " ");
    if (selDate) renderSlots();
  });

  /* ── calendar ──────────────────────────────── */
  var grid = $("calGrid"), monthLbl = $("monthLbl");
  var today = new Date(); today.setHours(0, 0, 0, 0);

  function renderCal() {
    var y = view.getFullYear(), m = view.getMonth();
    monthLbl.textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(view);
    grid.innerHTML = "";

    var first = new Date(y, m, 1);
    var lead = (first.getDay() + 6) % 7;                 // make Monday column 0
    var days = new Date(y, m + 1, 0).getDate();

    for (var i = 0; i < lead; i++) {
      var pad = document.createElement("span");
      pad.className = "cal__day cal__day--pad";
      grid.appendChild(pad);
    }

    for (var d = 1; d <= days; d++) {
      var dt = new Date(y, m, d);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cal__day";
      b.textContent = d;
      // open every day -- only the past is unbookable
      var bookable = dt >= today;
      b.disabled = !bookable;
      if (dt.getTime() === today.getTime()) b.classList.add("is-today");
      if (selDate && selDate.y === y && selDate.m === m && selDate.d === d) b.classList.add("is-sel");
      if (bookable) {
        (function (yy, mm, dd) {
          b.addEventListener("click", function () { pickDate(yy, mm, dd); });
        })(y, m, d);
      }
      grid.appendChild(b);
    }

    // never let the visitor page back before the current month
    $("prevM").disabled = (y === today.getFullYear() && m === today.getMonth());
  }

  function pickDate(y, m, d) {
    selDate = { y: y, m: m, d: d };
    renderCal();
    renderSlots();
  }

  $("prevM").addEventListener("click", function () { view.setMonth(view.getMonth() - 1); renderCal(); });
  $("nextM").addEventListener("click", function () { view.setMonth(view.getMonth() + 1); renderCal(); });

  /* ── slots ─────────────────────────────────── */
  var slotsEl = $("slots");

  function slotsFor(sd) {
    var out = [];
    for (var h = DAY_START; h < DAY_END; h++) {
      for (var mn = 0; mn < 60; mn += DURATION_MIN) {
        var inst = instant(sd.y, sd.m, sd.d, h, mn);
        if (inst.getTime() > Date.now()) out.push(inst);   // hide times already gone
      }
    }
    return out;
  }

  function renderSlots() {
    slotsEl.innerHTML = "";
    var list = slotsFor(selDate);

    if (!list.length) {
      slotsEl.innerHTML = '<p class="slots__empty">No times left on this day.<br />Try the next one.</p>';
      return;
    }

    // group by the visitor's own morning / afternoon / evening, not ours
    var groups = { Morning: [], Afternoon: [], Evening: [] };
    list.forEach(function (d) {
      var hr = +new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d);
      groups[hr < 12 ? "Morning" : hr < 17 ? "Afternoon" : "Evening"].push(d);
    });

    Object.keys(groups).forEach(function (g) {
      if (!groups[g].length) return;
      var h = document.createElement("div");
      h.className = "slots__grp"; h.textContent = g;
      slotsEl.appendChild(h);

      groups[g].forEach(function (d) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "slot";
        b.textContent = timeLabel(d);
        b.addEventListener("click", function () { pickSlot(d); });
        slotsEl.appendChild(b);
      });
    });
  }

  /* ── "next available" ──────────────────────── */
  $("soonBtn").addEventListener("click", function () {
    var probe = new Date(today);
    for (var i = 0; i < 30; i++) {
      var sd = { y: probe.getFullYear(), m: probe.getMonth(), d: probe.getDate() };
      if (slotsFor(sd).length) {
        view = new Date(sd.y, sd.m, 1);
        pickDate(sd.y, sd.m, sd.d);
        slotsEl.scrollTop = 0;
        return;
      }
      probe.setDate(probe.getDate() + 1);
    }
  });

  /* ── steps ─────────────────────────────────── */
  function step(n) {
    [1, 2, 3].forEach(function (i) { $("stage" + i).hidden = i !== n; });
    [].slice.call(document.querySelectorAll("#steps li")).forEach(function (li) {
      var s = +li.dataset.s;
      li.classList.toggle("is-on", s === n);
      li.classList.toggle("is-done", s < n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pickSlot(d) {
    selStart = d;
    $("chosen").innerHTML =
      "<b>" + dateLabel(d) + " · " + timeLabel(d) + "</b>" +
      "<span>" + DURATION_MIN + " min · Google Meet · " + tz.replace(/_/g, " ") + "</span>";
    step(2);
  }

  $("backBtn").addEventListener("click", function () { step(1); });
  $("againBtn").addEventListener("click", function () { step(1); });

  /* ── submit ────────────────────────────────── */
  var form = $("bkForm"), err = $("formErr");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("fName"), email = $("fEmail"), co = $("fCo");
    [name, email, co].forEach(function (f) { f.removeAttribute("aria-invalid"); });
    err.hidden = true;

    var bad = null;
    if (!name.value.trim()) bad = name;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) bad = email;
    else if (!co.value.trim()) bad = co;

    if (bad) {
      bad.setAttribute("aria-invalid", "true");
      err.textContent = bad === email ? "That email doesn't look right." : "This field is required.";
      err.hidden = false;
      bad.focus();
      return;
    }

    var end = new Date(selStart.getTime() + DURATION_MIN * 60000);

    $("doneSub").textContent = "A 30-minute walkthrough, held on Google Meet.";
    $("doneCard").innerHTML =
      "<div><b>When</b> · " + dateLabel(selStart) + "</div>" +
      "<div><b>Time</b> · " + timeLabel(selStart) + " – " + timeLabel(end) + " (" + tz.replace(/_/g, " ") + ")</div>" +
      "<div><b>Where</b> · Google Meet</div>" +
      "<div><b>For</b> · " + esc(name.value.trim()) + ", " + esc(co.value.trim()) + "</div>";

    wireOutputs(name.value.trim(), email.value.trim(), co.value.trim(), $("fUse").value.trim(), end);
    step(3);
  });

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ── .ics + mailto ─────────────────────────── */
  function icsStamp(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

  function wireOutputs(name, email, co, use, end) {
    var summary = "Lawvy — product demo (" + co + ")";
    var body = [
      "30-minute walkthrough of the Lawvy platform.",
      "", "Name: " + name, "Email: " + email, "Company: " + co,
      "When: " + dateLabel(selStart) + " " + timeLabel(selStart) + " (" + tz + ")",
      use ? "\nWhat to look at:\n" + use : ""
    ].join("\n");

    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lawvy Technologies//Demo//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@lawvy",
      "DTSTAMP:" + icsStamp(new Date()),
      "DTSTART:" + icsStamp(selStart),
      "DTEND:" + icsStamp(end),
      "SUMMARY:" + summary,
      "DESCRIPTION:" + body.replace(/\n/g, "\\n"),
      "ORGANIZER;CN=Lawvy Technologies:mailto:" + TO,
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");

    $("icsBtn").onclick = function () {
      var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "lawvy-demo.ics";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };

    // Google Calendar opens in the browser -- no mail client, no Outlook handoff
    $("gcalBtn").href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(summary) +
      "&dates=" + icsStamp(selStart) + "/" + icsStamp(end) +
      "&details=" + encodeURIComponent(body) +
      "&location=" + encodeURIComponent("Google Meet") +
      "&add=" + encodeURIComponent(TO);
  }

  /* ── go ────────────────────────────────────── */
  renderCal();
})();
