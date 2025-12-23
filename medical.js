// static/predict.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("predict-form");
  const btn = document.getElementById("predict-btn");
  const resetBtn = document.getElementById("reset-btn");
  const resultCard = document.getElementById("result-card");
  const errorBox = document.getElementById("error-box");
  const probVal = document.getElementById("prob-val");
  const riskBadge = document.getElementById("risk-badge");
  const advice = document.getElementById("advice");
  const gaugeDiv = document.getElementById("gauge");

  function showError(msg){
    errorBox.classList.remove("hidden");
    errorBox.innerHTML = `<p>${msg}</p>`;
    resultCard.classList.add("hidden");
  }

  function hideError(){
    errorBox.classList.add("hidden");
    errorBox.innerHTML = "";
  }

  function renderGauge(prob){
    const value = Math.min(100, Math.max(0, prob));
    const data = [{
      type: "indicator",
      mode: "gauge+number",
      value: value,
      gauge: {
        axis: { range: [0, 100], tickmode: "auto" },
        bar: { color: value > 60 ? "#ef4444" : value > 30 ? "#f59e0b" : "#10b981" },
        steps: [
          { range: [0, 30], color: "#ecfccb" },
          { range: [30, 60], color: "#fff7ed" },
          { range: [60, 100], color: "#fff1f2" }
        ]
      },
      number: { suffix: "%" },
      domain: { x: [0, 1], y: [0, 1] }
    }];

    const layout = {
      margin: { t: 8, b: 8, l: 8, r: 8 },
      height: 220,
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e6eef6", family: "Inter, system-ui" }
    };

    Plotly.react(gaugeDiv, data, layout, {displayModeBar:false, responsive:true});
  }

  function showResult(prob, label){
    hideError();
    resultCard.classList.remove("hidden");
    const probRounded = +prob.toFixed(1);
    probVal.textContent = probRounded;
    if(label === 1){
      riskBadge.textContent = "High risk";
      riskBadge.className = "badge bad";
      advice.innerHTML = "<strong>Advice:</strong> High probability — recommend clinical follow-up, further tests (ECG, lipid panel), and lifestyle modification.";
    } else {
      riskBadge.textContent = "Low risk";
      riskBadge.className = "badge good";
      advice.innerHTML = "<strong>Advice:</strong> Low probability. Maintain healthy lifestyle and periodic checkups.";
    }
    renderGauge(probRounded);
  }

  function validateAndSerialize(form){
    const fd = new FormData(form);
    const data = {};
    for(const [k,v] of fd.entries()){
      if(v === "") throw new Error("Please fill all fields correctly.");
      data[k] = v;
    }
    const age = parseFloat(data.age);
    const ap_hi = parseFloat(data.ap_hi);
    const ap_lo = parseFloat(data.ap_lo);
    if(isNaN(age) || age <= 0) throw new Error("Enter a valid age.");
    if(isNaN(ap_hi) || isNaN(ap_lo) || ap_lo > ap_hi) throw new Error("Diastolic must be <= Systolic.");
    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = "Predicting...";
    hideError();

    let payload;
    try {
      payload = validateAndSerialize(form);
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = "Predict Risk";
      return;
    }

    try {
      const resp = await fetch("/predict_api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await resp.json();
      if(!body.success){
        showError(body.error || "Server error");
      } else {
        showResult(body.prob, body.label);
      }
    } catch (err){
      showError("Network error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Predict Risk";
    }
  });

  resetBtn.addEventListener("click", () => {
    // Clear every input and select so user must re-enter values
    document.querySelectorAll("#predict-form input, #predict-form select")
      .forEach(el => el.value = "");
    hideError();
    resultCard.classList.add("hidden");
  });
});
