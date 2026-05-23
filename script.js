(function() {
  'use strict';

  // Safe localStorage wrapper
  function safeGet(key, def) {
    try { var v = localStorage.getItem(key); return v !== null ? v : def; } catch(e) { return def; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch(e) {}
  }
  function safeJSON(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v !== null ? v : def; } catch(e) { return def; }
  }

  // ===== DOM REFS =====
  var $ = function(id) { return document.getElementById(id); };
  var navToggle = $('navToggle');
  var navLinks = $('navLinks');
  var analyzeBtn = $('analyzeBtn');
  var activityHidden = $('activity');
  var dashboardSec = $('dashboard');
  var planSec = $('plan');
  var chatbotBtn = $('chatbotBtn');
  var chatbotWindow = $('chatbotWindow');
  var chatbotClose = $('chatbotClose');
  var chatInput = $('chatInput');
  var chatSend = $('chatSend');
  var chatMessages = $('chatbotMessages');
  var logDayBtn = $('logDayBtn');
  var downloadBtn = $('downloadReport');
  var shareBtn = $('shareBtn');

  // ===== NAVIGATION =====
  navToggle && navToggle.addEventListener('click', function() { navLinks.classList.toggle('open'); });
  var navLinksList = document.querySelectorAll('.nav-links a');
  navLinksList.forEach(function(a) { a.addEventListener('click', function() { navLinks.classList.remove('open'); }); });

  var sections = document.querySelectorAll('.section, .hero');
  window.addEventListener('scroll', function() {
    var current = 'home';
    sections.forEach(function(sec) {
      if (window.scrollY >= sec.offsetTop - 150) current = sec.id || 'home';
    });
    navLinksList.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });

  // ===== DIET SELECTOR (PRO) =====
  var dietHidden = $('dietType');
  var dietLabels = { veg: 'Vegetarian', nonveg: 'Non-Veg' };
  var activeTabBeforeDietChange = null;

  function handleDietSelect(opt) {
    document.querySelectorAll('.diet-option').forEach(function(o) { o.classList.remove('active'); });
    opt.classList.add('active');
    dietHidden.value = opt.dataset.value;
    // Auto re-analyze + switch to diet tab if dashboard is showing
    if (dashboardSec.style.display !== 'none' && typeof analyze === 'function') {
      var activeTab = document.querySelector('.plan-tab.active');
      if (activeTab) activeTabBeforeDietChange = activeTab.dataset.tab;
      analyze();
      setTimeout(function() {
        var dietTab = document.querySelector('.plan-tab[data-tab="diet"]');
        if (dietTab) {
          document.querySelectorAll('.plan-tab').forEach(function(t) { t.classList.remove('active'); });
          document.querySelectorAll('.plan-content').forEach(function(c) { c.classList.remove('active'); });
          dietTab.classList.add('active');
          var target = $('tab-diet');
          if (target) target.classList.add('active');
        }
        planSec.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

  document.querySelectorAll('.diet-option').forEach(function(opt) {
    opt.addEventListener('click', function(e) { handleDietSelect(this); });
    opt.addEventListener('touchstart', function(e) { e.preventDefault(); handleDietSelect(this); }, { passive: false });
  });
  // Sync hidden input with active option on load
  var activeDiet = document.querySelector('.diet-option.active');
  if (activeDiet) dietHidden.value = activeDiet.dataset.value;

  // ===== ACTIVITY SELECTOR =====
  var activityLabels = { low: 'Low', medium: 'Medium', high: 'High' };
  function handleActivitySelect(opt) {
    document.querySelectorAll('.activity-option').forEach(function(o) { o.classList.remove('active'); });
    opt.classList.add('active');
    activityHidden.value = opt.dataset.value;
  }
  document.querySelectorAll('.activity-option').forEach(function(opt) {
    opt.addEventListener('click', function(e) { handleActivitySelect(this); });
    opt.addEventListener('touchstart', function(e) { e.preventDefault(); handleActivitySelect(this); }, { passive: false });
  });

  // ===== GENDER → MENSTRUATION TOGGLE =====
  var genderEl = $('gender');
  var menstruationWrap = $('menstruationWrap');
  var menstruationHidden = $('menstruation');
  function toggleMenstruation(g) {
    if (!menstruationWrap) return;
    menstruationWrap.style.display = g === 'female' ? 'block' : 'none';
    if (g !== 'female' && menstruationHidden) {
      menstruationHidden.value = 'no';
      document.querySelectorAll('.menstruation-option').forEach(function(o) { o.classList.remove('active'); });
      var noOpt = document.querySelector('.menstruation-option[data-value="no"]');
      if (noOpt) noOpt.classList.add('active');
    }
  }
  function handleMenstruationSelect(opt) {
    document.querySelectorAll('.menstruation-option').forEach(function(o) { o.classList.remove('active'); });
    opt.classList.add('active');
    if (menstruationHidden) menstruationHidden.value = opt.dataset.value;
  }
  document.querySelectorAll('.menstruation-option').forEach(function(opt) {
    opt.addEventListener('click', function() { handleMenstruationSelect(this); });
    opt.addEventListener('touchstart', function(e) { e.preventDefault(); handleMenstruationSelect(this); }, { passive: false });
  });
  if (genderEl) {
    genderEl.addEventListener('change', function() { toggleMenstruation(this.value); });
  }
  // Re-check on saved profile restore
  var savedProfile = safeJSON('fithomey_profile', null);
  if (savedProfile && savedProfile.gender === 'female' && menstruationWrap) {
    toggleMenstruation('female');
    if (menstruationHidden && savedProfile.menstruation) {
      menstruationHidden.value = 'yes';
      var yesOpt = document.querySelector('.menstruation-option[data-value="yes"]');
      if (yesOpt) { document.querySelectorAll('.menstruation-option').forEach(function(o) { o.classList.remove('active'); }); yesOpt.classList.add('active'); }
    }
  }

  // ===== ANALYZE =====
  analyzeBtn && analyzeBtn.addEventListener('click', analyze);

  function getInputs() {
    var age = parseInt($('age').value) || 25;
    var height = parseFloat($('height').value) || 175;
    if ($('heightUnit').value === 'ft') height *= 30.48;
    var weight = parseFloat($('weight').value) || 70;
    var gender = $('gender').value;
    var activity = activityHidden.value;
    var diet = dietHidden.value;
    var menstruation = menstruationHidden ? menstruationHidden.value === 'yes' : false;
    var problem = ($('problem') ? $('problem').value : 'general') || 'general';
    return { age: age, height: height, weight: weight, gender: gender, activity: activity, diet: diet, menstruation: menstruation, problem: problem };
  }

  var badgesData = [
    { name: 'Beginner', icon: '🌱', desc: 'Start your journey', key: 'beginner' },
    { name: 'Fit Pro', icon: '💪', desc: 'Analyze your health', key: 'fitpro' },
    { name: 'Athlete', icon: '🏆', desc: '7-day streak', key: 'athlete' },
    { name: 'Hydration Hero', icon: '💧', desc: 'Log 3 days', key: 'hydra' },
    { name: 'Dedication', icon: '🔥', desc: 'Log 7 days', key: 'dedication' }
  ];

  var userBadges = safeJSON('fithomey_badges', []);
  var streak = parseInt(safeGet('fithomey_streak', '0')) || 0;
  var lastLog = safeGet('fithomey_lastlog', '');
  var challengeProgress = parseInt(safeGet('fithomey_challenge', '0')) || 0;

  function renderBadges() {
    var container = $('badgesContainer');
    if (!container) return;
    container.innerHTML = badgesData.map(function(b) {
      var unlocked = userBadges.indexOf(b.key) !== -1;
      return '<div class="badge-item ' + (unlocked ? 'unlocked' : 'locked') + '">' +
        '<div class="badge-icon">' + b.icon + '</div>' +
        '<span class="badge-name">' + b.name + '</span>' +
        '<span class="badge-desc">' + b.desc + '</span></div>';
    }).join('');
  }

  function unlockBadge(key) {
    if (userBadges.indexOf(key) === -1) {
      userBadges.push(key);
      safeSet('fithomey_badges', JSON.stringify(userBadges));
      renderBadges();
      showBadgeNotification(key);
    }
  }

  function showBadgeNotification(key) {
    var b = badgesData.find(function(x) { return x.key === key; });
    if (!b) return;
    var notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;top:100px;right:24px;background:linear-gradient(135deg,#1a1f35,#2a2f55);border:2px solid #ffd700;border-radius:16px;padding:20px 28px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.6);animation:slideUp 0.5s ease;text-align:center';
    notif.innerHTML = '<div style="font-size:3rem;margin-bottom:8px">' + b.icon + '</div><div style="font-weight:700;color:#ffd700;font-size:1.1rem">Badge Unlocked!</div><div style="color:#e2e8f0;font-size:0.9rem;margin-top:4px">' + b.name + '</div>';
    document.body.appendChild(notif);
    setTimeout(function() { notif.remove(); }, 3000);
  }

  function analyze() {
    var d = getInputs();
    var heightM = d.height / 100;
    var bmi = d.weight / (heightM * heightM);
    var bmiCat = 'Normal';
    if (bmi < 18.5) bmiCat = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCat = 'Overweight';
    else if (bmi >= 30) bmiCat = 'Obese';

    var bmr = d.gender === 'male' ? 10 * d.weight + 6.25 * d.height - 5 * d.age + 5 : 10 * d.weight + 6.25 * d.height - 5 * d.age - 161;
    var actMul = { low: 1.2, medium: 1.55, high: 1.9 };
    var tdee = Math.round(bmr * (actMul[d.activity] || 1.55));
    var water = Math.round(d.weight * 0.033 * 10) / 10;

    var score = 50;
    if (bmi >= 18.5 && bmi < 25) score += 20;
    else if (bmi >= 25 && bmi < 30) score += 5;
    else score -= 10;
    if (d.age >= 18 && d.age <= 40) score += 10;
    else if (d.age > 40 && d.age <= 60) score += 5;
    else if (d.age > 60) score -= 5;
    if (d.activity === 'high') score += 15;
    else if (d.activity === 'medium') score += 8;
    if (d.weight >= 50 && d.weight <= 90) score += 5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    var fitLevel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Needs Improvement';

    // Update DOM
    var bmiVal = $('bmiValue'); if (bmiVal) bmiVal.textContent = bmi.toFixed(1);
    var bmiCatEl = $('bmiCategory'); if (bmiCatEl) bmiCatEl.textContent = bmiCat;
    var bmiProg = $('bmiProgress'); if (bmiProg) bmiProg.style.width = Math.min(bmi / 40 * 100, 100) + '%';

    var calVal = $('calorieValue'); if (calVal) calVal.textContent = tdee.toLocaleString();
    var watVal = $('waterValue'); if (watVal) watVal.textContent = water;
    var watProg = $('waterProgress'); if (watProg) watProg.style.width = Math.min(water / 4 * 100, 100) + '%';

    var fitVal = $('fitnessScore'); if (fitVal) fitVal.textContent = score;
    var fitLev = $('fitnessLevel'); if (fitLev) fitLev.textContent = fitLevel;
    var fitProg = $('fitnessProgress'); if (fitProg) fitProg.style.width = score + '%';

    // Health Risk
    var riskLevel, riskMsg, riskColor, riskPct;
    if (bmi >= 30 || score < 30) {
      riskLevel = 'High Risk'; riskMsg = 'Your health indicators suggest significant risk. Consider consulting a doctor.';
      riskColor = '#ef4444'; riskPct = 85;
    } else if (bmi >= 25 || score < 50) {
      riskLevel = 'Medium Risk'; riskMsg = 'Some health indicators need attention. Improving diet and exercise is recommended.';
      riskColor = '#f59e0b'; riskPct = 50;
    } else {
      riskLevel = 'Low Risk'; riskMsg = 'You are in a healthy range. Keep up the good work!';
      riskColor = '#10b981'; riskPct = 20;
    }
    var riskEl = $('riskLevel');
    if (riskEl) {
      riskEl.textContent = riskLevel;
      riskEl.style.color = riskColor;
      riskEl.style.border = '2px solid ' + riskColor;
      riskEl.style.background = riskLevel === 'Low Risk' ? 'rgba(16,185,129,0.1)' : riskLevel === 'Medium Risk' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
    }
    var riskMsgEl = $('riskMessage'); if (riskMsgEl) riskMsgEl.textContent = riskMsg;
    var riskFill = $('riskProgress'); if (riskFill) { riskFill.style.width = riskPct + '%'; riskFill.style.background = riskColor; }

    dashboardSec.style.display = 'block';
    planSec.style.display = 'block';

    generatePlan({ age: d.age, height: d.height, weight: d.weight, gender: d.gender, activity: d.activity, diet: d.diet, menstruation: d.menstruation, problem: d.problem, bmi: bmi, tdee: tdee });
    dashboardSec.scrollIntoView({ behavior: 'smooth' });
    unlockBadge('fitpro');
    safeSet('fithomey_profile', JSON.stringify({ age: d.age, height: d.height, weight: d.weight, gender: d.gender, activity: d.activity, diet: d.diet, menstruation: d.menstruation, problem: d.problem, bmi: bmi, tdee: tdee, water: water, score: score, riskLevel: riskLevel }));
  }

  // ===== PLAN GENERATOR =====
  function generatePlan(data) {
    var age = data.age, gender = data.gender, weight = data.weight, height = data.height;
    var bmi = data.bmi, activity = data.activity, tdee = data.tdee, diet = data.diet || 'nonveg';
    var isMenstruating = gender === 'female' && data.menstruation === true;
    var problem = data.problem || 'general';

    // Age groups
    var isYoung = age < 18, isAdult = age >= 18 && age <= 35, isMid = age > 35 && age <= 50, isSenior = age > 50;
    // Weight categories
    var isUnderweight = bmi < 18.5, isNormal = bmi >= 18.5 && bmi < 25, isOverweight = bmi >= 25 && bmi < 30, isObese = bmi >= 30;
    var isOverweightBMI = isOverweight || isObese;
    // Activity
    var isActive = activity === 'high', isMed = activity === 'medium', isLow = activity === 'low';
    // Gender
    var isMale = gender === 'male';
    // Weight in kg ranges
    var isHeavy = weight > 90, isLight = weight < 55;

    // --- HOME WORKOUT (personalized + randomized each time) ---
    function pick(n, pool) {
      var s = pool.slice(), r = [];
      while (s.length && r.length < n) {
        var i = Math.floor(Math.random() * s.length);
        r.push(s.splice(i, 1)[0]);
      }
      return r;
    }
    var problemData = {
      weight_loss: {
        home: ['Jumping Jacks (3x30)','High Knees (3x30s)','Burpees (3x10)','Mountain Climbers (3x25s)','Plank Jacks (3x12)','Bicycle Crunches (3x15 each)','Squat Jumps (3x10)','Push-ups (3x12)','Lunges (3x10 each)','Tuck Jumps (3x8)','Box Jumps (3x8)','Flutter Kicks (3x20)','Heisman Shuffle (3x20)','Speed Skaters (3x10 each)','Plank with Shoulder Taps (3x12 each)'],
        gym: ['Treadmill HIIT (20 min)','Deadlift (4x8)','Leg Press (4x15)','Lat Pulldown (4x12)','Cable Row (4x12)','Dumbbell Bench Press (4x10)','HIIT Finisher (15 min)','Walking Lunges (3x12 each)','Cable Crunch (3x15)','Battle Ropes (30s x 5)','Kettlebell Swings (3x15)','Box Jumps (3x10)','Farmers Walk (3x30s)','Rowing Machine (15 min)','Plank (3x45s)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + green tea + chia seeds'},{name:'Snack',desc:'Green apple + almonds (10)'},{name:'Lunch',desc:'Quinoa salad + chickpeas + cucumber + lemon'},{name:'Snack',desc:'Greek yogurt + flax seeds'},{name:'Dinner',desc:'Grilled tofu + broccoli + cauliflower rice + stir-fry'}],
        meals_nv: [{name:'Breakfast',desc:'Egg white omelette + oatmeal + green tea'},{name:'Snack',desc:'Apple + almonds (10)'},{name:'Lunch',desc:'Grilled chicken salad + quinoa + lemon'},{name:'Snack',desc:'Greek yogurt + chia seeds'},{name:'Dinner',desc:'Steamed fish + broccoli + asparagus'}],
        eat: ['🥬 Leafy Greens','🍗 Lean Protein','🫐 Berries','🥜 Nuts (limited)','🌾 Quinoa','🍵 Green Tea','🥦 Cruciferous Veggies','🌱 Sprouts','🥑 Avocado (limited)','🫘 Legumes'],
        avoid: ['🚫 Sugar-Sweetened Beverages','🚫 Fried Foods','🚫 White Rice/Bread','🚫 High-Sugar Fruits','🚫 Packaged Snacks','🚫 Alcohol','🚫 Excess Oil','🚫 Refined Carbs'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'20 min after 2 PM',dur:'7-8 hours',label:'🔥 Weight Loss Mode'
      },
      weight_gain: {
        home: ['Bodyweight Squats (3x15)','Push-ups (3x12)','Lunges (3x12 each)','Plank (3x30s)','Glute Bridges (3x15)','Crunches (3x15)','Calf Raises (3x20)','Diamond Push-ups (3x10)','Step-ups (3x12 each)','Tricep Dips (3x10)','Wall Sit (3x30s)','Jump Squats (3x8)','Incline Push-ups (3x10)','Chair Dips (3x10)','Bicycle Crunches (3x15 each)'],
        gym: ['Squats (4x10)','Bench Press (4x10)','Barbell Row (4x10)','Overhead Press (4x8)','Deadlift (3x8)','Pull-ups (3x8)','Bicep Curls (3x12)','Leg Press (4x12)','Dumbbell Fly (3x10)','Tricep Pushdown (3x12)','Cable Crunch (3x12)','Face Pulls (3x12)','Hammer Curls (3x10)','Chest Fly (3x10)','Shrugs (3x12)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + banana + peanut butter + soy milk + nuts'},{name:'Snack',desc:'Smoothie with protein powder + banana + nut butter'},{name:'Lunch',desc:'Chickpea wrap + avocado + quinoa + yogurt + cheese'},{name:'Snack',desc:'Trail mix + banana + protein bar'},{name:'Dinner',desc:'Paneer curry + rice + dal + mixed veggies + ghee'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (4) + whole grain toast + avocado + milk'},{name:'Snack',desc:'Protein shake + banana + peanut butter'},{name:'Lunch',desc:'Chicken breast (200g) + brown rice + sweet potato + veggies'},{name:'Snack',desc:'Cottage cheese + almonds + dried fruits'},{name:'Dinner',desc:'Lean steak (200g) + mashed potatoes + veggies + butter'}],
        eat: ['🥚 Eggs','🥩 Red Meat','🥜 Nuts & Butters','🥑 Avocado','🍌 Bananas','🌾 Whole Grains','🥛 Full-Fat Dairy','🍇 Dried Fruits','🧀 Cheese','🫘 Legumes','🍚 Rice','🥔 Potatoes'],
        avoid: ['🚫 Low-Calorie Foods','🚫 Sugary Drinks (empty cals)','🚫 Excess Fiber (fills you up)','🚫 Diet/Sugar-Free Products','🚫 Salads as meals','🚫 Excess Water Before Meals'],
        bed:'10:30 PM',wake:'7:00 AM',nap:'30 min after 1 PM',dur:'8+ hours',label:'💪 Mass Building Mode'
      },
      diabetes: {
        home: ['Brisk Walking (30 min)','Bodyweight Squats (3x12)','Push-ups (3x10)','Glute Bridges (3x12)','Plank (3x20s)','Chair Dips (3x10)','Standing Calf Raises (3x15)','Seated Leg Raises (3x12)','Wall Push-ups (3x12)','Marching in Place (3x30s)','Heel Raises (3x15)','Cat-Cow Stretch (10)','Arm Circles (30s)','Knee Push-ups (3x8)','Side Leg Raises (3x10 each)'],
        gym: ['Treadmill Walk (20 min)','Seated Cable Row (3x12)','Lat Pulldown (3x12)','Leg Press (3x15)','Chest Press Machine (3x12)','Stationary Bike (15 min)','Elliptical (15 min)','Hip Abductor (3x12)','Shoulder Press Machine (3x10)','Plank (3x20s)','Seated Leg Curl (3x12)','Cable Bicep Curl (3x10)','Tricep Pushdown (3x10)','Back Extension (3x10)','Light Dumbbell Press (3x10)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + cinnamon + berries + nuts + soy milk (no sugar)'},{name:'Snack',desc:'Handful of almonds + green tea'},{name:'Lunch',desc:'Quinoa + chickpea salad + leafy greens + lemon dressing'},{name:'Snack',desc:'Greek yogurt + chia seeds'},{name:'Dinner',desc:'Grilled tofu + steamed broccoli + cauliflower rice + stir-fry'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + whole grain toast + avocado (no sugar)'},{name:'Snack',desc:'Almonds + walnuts + green tea'},{name:'Lunch',desc:'Grilled chicken + quinoa + leafy greens + lemon'},{name:'Snack',desc:'Greek yogurt + flax seeds'},{name:'Dinner',desc:'Grilled fish + steamed veggies + small sweet potato'}],
        eat: ['🥬 Leafy Greens','🫐 Berries','🥜 Nuts & Seeds','🌾 Whole Grains (low GI)','🥛 Greek Yogurt','🐟 Fatty Fish','🫘 Legumes (limited)','🥑 Avocado','🫒 Olive Oil','🍵 Green Tea','🧅 Cinnamon','🍠 Sweet Potato (limited)'],
        avoid: ['🚫 Sugar & Sweets','🚫 White Rice/Bread','🚫 Sugary Drinks','🚫 Fruit Juices','🚫 Fried Foods','🚫 Processed Carbs','🚫 Sweetened Yogurts','🚫 Alcohol','🚫 Dried Fruits (excess)','🚫 High-GI Fruits (mango, watermelon)'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'20 min after lunch',dur:'7-8 hours',label:'🩸 Diabetes Care'
      },
      pcod: {
        home: ['Yoga Flow (15 min)','Brisk Walking (20 min)','Bodyweight Squats (3x12)','Glute Bridges (3x15)','Plank (3x25s)','Cat-Cow Stretch (10)','Child\'s Pose (1 min)','Seated Twist (30s each)','Butterfly Stretch (30s)','Standing Calf Raises (3x15)','Lunges (3x10 each)','Knee Push-ups (3x8)','Bird Dog (3x8 each)','Side Plank (3x15s each)','Cobra Stretch (30s)'],
        gym: ['Treadmill Walk (20 min)','Seated Cable Row (3x12)','Lat Pulldown (3x12)','Leg Press (3x15)','Chest Press Machine (3x12)','Hip Thrust Machine (3x15)','Stationary Bike (15 min)','Elliptical (15 min)','Dumbbell Shoulder Press (3x10)','Cable Crunch (3x12)','Glute Kickbacks (3x12 each)','Seated Leg Curl (3x12)','Hip Abductor (3x12)','Plank (3x25s)','Back Extension (3x10)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + cinnamon + soy milk'},{name:'Snack',desc:'Handful of almonds + green tea'},{name:'Lunch',desc:'Quinoa salad + chickpeas + avocado + leafy greens'},{name:'Snack',desc:'Greek yogurt + pumpkin seeds'},{name:'Dinner',desc:'Grilled tofu + broccoli + sweet potato + stir-fry'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + avocado + whole grain toast + flax seeds'},{name:'Snack',desc:'Almonds + walnuts + green tea'},{name:'Lunch',desc:'Grilled chicken + quinoa + leafy greens + avocado'},{name:'Snack',desc:'Greek yogurt + pumpkin seeds'},{name:'Dinner',desc:'Grilled salmon + broccoli + sweet potato'}],
        eat: ['🥬 Leafy Greens','🥚 Eggs','🐟 Fatty Fish (salmon)','🥑 Avocado','🥜 Nuts & Seeds (flax, pumpkin)','🌾 Whole Grains (low GI)','🫐 Berries','🥛 Greek Yogurt','🫘 Legumes','🍵 Green Tea','🫒 Olive Oil','🧅 Cinnamon'],
        avoid: ['🚫 Sugar & Sweets','🚫 White Rice/Bread','🚫 Sugary Drinks','🚫 Fried Foods','🚫 Dairy (excess)','🚫 Soy (excess)','🚫 Processed Carbs','🚫 Alcohol','🚫 Caffeine (excess)'],
        bed:'10:30 PM',wake:'6:30 AM',nap:'20 min after lunch',dur:'8 hours',label:'🌸 PCOD/PCOS Care'
      },
      thyroid: {
        home: ['Brisk Walking (25 min)','Bodyweight Squats (3x12)','Push-ups (3x10)','Glute Bridges (3x12)','Plank (3x20s)','Lunges (3x10 each)','Standing Calf Raises (3x15)','Cat-Cow Stretch (10)','Seated Row with Band (3x12)','Arm Circles (30s each)','Neck Rolls (30s each)','Marching in Place (3x30s)','Wall Push-ups (3x10)','Chair Dips (3x10)','Bird Dog (3x8 each)'],
        gym: ['Treadmill Walk (20 min)','Leg Press (3x15)','Lat Pulldown (3x12)','Seated Cable Row (3x12)','Chest Press Machine (3x12)','Stationary Bike (15 min)','Elliptical (15 min)','Dumbbell Shoulder Press (3x10)','Hip Abductor (3x12)','Plank (3x25s)','Cable Bicep Curl (3x10)','Tricep Pushdown (3x10)','Seated Leg Curl (3x12)','Back Extension (3x10)','Cable Crunch (3x12)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + Brazil nuts (2) + soy milk'},{name:'Snack',desc:'Apple + almonds + green tea'},{name:'Lunch',desc:'Quinoa salad + chickpeas + leafy greens + avocado'},{name:'Snack',desc:'Greek yogurt + pumpkin seeds'},{name:'Dinner',desc:'Grilled tofu + stir-fried veggies + brown rice (small)'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + whole grain toast + avocado + Brazil nuts (2)'},{name:'Snack',desc:'Apple + almonds + green tea'},{name:'Lunch',desc:'Grilled chicken + quinoa + leafy greens'},{name:'Snack',desc:'Greek yogurt + pumpkin seeds'},{name:'Dinner',desc:'Grilled fish + steamed veggies + small sweet potato'}],
        eat: ['🐟 Fatty Fish (salmon)','🥚 Eggs','🥜 Brazil Nuts (2/day)','🫐 Berries','🥬 Leafy Greens','🥜 Nuts & Seeds','🌾 Whole Grains','🫘 Legumes','🥛 Greek Yogurt','🫒 Olive Oil','🍵 Green Tea','🥑 Avocado'],
        avoid: ['🚫 Soy (excess - interferes with thyroid meds)','🚫 Cruciferous Veggies (raw excess)','🚫 Gluten (if sensitive)','🚫 Sugar & Sweets','🚫 Processed Carbs','🚫 Alcohol','🚫 Caffeine (excess)','🚫 Iodine Supplements (without doctor)'],
        bed:'10:30 PM',wake:'6:30 AM',nap:'20 min after lunch',dur:'8 hours',label:'🦋 Thyroid Balance'
      },
      high_bp: {
        home: ['Brisk Walking (30 min)','Cat-Cow Stretch (10)','Child\'s Pose (1 min)','Seated Twist (30s each)','Butterfly Stretch (30s)','Neck Rolls (30s each)','Shoulder Rolls (20)','Standing Calf Raises (3x12)','Chair Dips (3x8)','Marching in Place (3x20s)','Wall Push-ups (3x10)','Seated Leg Raises (3x10)','Deep Breathing (5 min)','Ankle Rotations (20 each)','Gentle Yoga Flow (10 min)'],
        gym: ['Treadmill Walk (20 min)','Stationary Bike (15 min)','Seated Chest Press (3x10)','Lat Pulldown (3x10)','Leg Press (3x12)','Seated Cable Row (3x10)','Elliptical (15 min)','Shoulder Press Machine (3x10)','Hip Abductor (3x12)','Plank (3x20s)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Back Extension (3x8)','Seated Leg Curl (3x10)','Cable Crunch (3x10)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + banana (low salt)'},{name:'Snack',desc:'Apple + unsalted almonds + green tea'},{name:'Lunch',desc:'Quinoa + chickpea salad + leafy greens + lemon (no salt added)'},{name:'Snack',desc:'Greek yogurt + berries'},{name:'Dinner',desc:'Grilled tofu + steamed veggies + brown rice (low sodium)'}],
        meals_nv: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + banana (low salt)'},{name:'Snack',desc:'Apple + unsalted almonds + green tea'},{name:'Lunch',desc:'Grilled chicken + quinoa + leafy greens (no salt added)'},{name:'Snack',desc:'Greek yogurt + berries'},{name:'Dinner',desc:'Grilled fish + steamed broccoli + sweet potato'}],
        eat: ['🥬 Leafy Greens','🍌 Bananas','🫐 Berries','🥑 Avocado','🌾 Oats & Whole Grains','🥜 Unsalted Nuts','🫘 Legumes','🫒 Olive Oil','🍵 Green Tea','🐟 Fatty Fish','🧄 Garlic','🍠 Sweet Potato'],
        avoid: ['🚫 Excess Salt/Sodium','🚫 Processed Foods','🚫 Fried Foods','🚫 Alcohol','🚫 Caffeine (excess)','🚫 Sugary Drinks','🚫 Red Meat (excess)','🚫 Pickled/Preserved Foods','🚫 Cold Drinks'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'20 min after lunch',dur:'7-8 hours',label:'❤️ BP Care'
      },
      cholesterol: {
        home: ['Brisk Walking (30 min)','Bodyweight Squats (3x12)','Push-ups (3x10)','Plank (3x25s)','Glute Bridges (3x12)','Lunges (3x10 each)','Standing Calf Raises (3x15)','Jumping Jacks (3x20)','Mountain Climbers (3x20s)','Cat-Cow Stretch (10)','Arm Circles (30s)','High Knees (3x20s)','Chair Dips (3x8)','Heel Raises (3x15)','Knee Push-ups (3x8)'],
        gym: ['Treadmill Walk (20 min)','Rowing Machine (15 min)','Leg Press (3x15)','Lat Pulldown (3x12)','Seated Cable Row (3x12)','Chest Press Machine (3x12)','Stationary Bike (15 min)','Elliptical (15 min)','Cable Crunch (3x12)','Plank (3x30s)','Dumbbell Shoulder Press (3x10)','Walking Lunges (3x10 each)','Seated Leg Curl (3x12)','Back Extension (3x10)','Hip Abductor (3x12)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + almonds + soy milk'},{name:'Snack',desc:'Apple + walnuts + green tea'},{name:'Lunch',desc:'Quinoa + chickpea + avocado + leafy greens + lemon'},{name:'Snack',desc:'Greek yogurt + chia seeds'},{name:'Dinner',desc:'Grilled tofu + broccoli + roasted veggies + olive oil'}],
        meals_nv: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + walnuts'},{name:'Snack',desc:'Apple + almonds + green tea'},{name:'Lunch',desc:'Grilled salmon + quinoa + leafy greens + avocado'},{name:'Snack',desc:'Greek yogurt + chia seeds'},{name:'Dinner',desc:'Grilled chicken breast + steamed broccoli + sweet potato'}],
        eat: ['🌾 Oats & Barley','🥜 Nuts (almonds, walnuts)','🐟 Fatty Fish (salmon, mackerel)','🥑 Avocado','🫒 Olive Oil','🥬 Leafy Greens','🫐 Berries','🫘 Legumes','🍵 Green Tea','🧄 Garlic','🌱 Flax & Chia Seeds','🍎 Apples'],
        avoid: ['🚫 Trans Fats','🚫 Fried Foods','🚫 Red Meat (excess)','🚫 Butter & Cream','🚫 Processed Meats','🚫 Sugary Drinks','🚫 White Bread/Pasta','🚫 Full-Fat Dairy (excess)','🚫 Alcohol','🚫 Coconut Oil (excess)'],
        bed:'10:30 PM',wake:'6:30 AM',nap:'20 min after lunch',dur:'7-8 hours',label:'💚 Cholesterol Control'
      },
      joint_pain: {
        home: ['Gentle Yoga (15 min)','Water-like Walking (20 min)','Cat-Cow Stretch (10)','Child\'s Pose (1 min)','Seated Leg Raises (3x10)','Seated Spinal Twist (30s each)','Butterfly Stretch (30s)','Neck Rolls (30s each)','Shoulder Rolls (20)','Ankle Rotations (20 each)','Wrist Stretches (30s)','Standing Calf Raises (3x10)','Chair Sit-to-Stand (3x8)','Seated Hamstring Stretch (30s each)','Deep Breathing (5 min)'],
        gym: ['Stationary Bike (15 min)','Seated Chest Press (3x10)','Seated Cable Row (3x10)','Lat Pulldown (3x10)','Leg Press (3x12)','Seated Shoulder Press (3x10)','Hip Abductor Machine (3x12)','Seated Leg Curl (3x10)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Plank (3x15s)','Back Extension (3x8)','Elliptical (10 min)','Arm Curl Machine (3x10)','Swimming (if available)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + walnuts + turmeric + soy milk'},{name:'Snack',desc:'Apple + almonds + ginger tea'},{name:'Lunch',desc:'Quinoa + chickpea + leafy greens + broccoli + turmeric'},{name:'Snack',desc:'Greek yogurt + chia seeds + berries'},{name:'Dinner',desc:'Grilled tofu + stir-fried veggies + brown rice + turmeric'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + whole grain toast + avocado + turmeric'},{name:'Snack',desc:'Apple + walnuts + ginger tea'},{name:'Lunch',desc:'Grilled salmon + quinoa + broccoli + turmeric'},{name:'Snack',desc:'Greek yogurt + chia seeds + berries'},{name:'Dinner',desc:'Grilled chicken + sweet potato + steamed veggies'}],
        eat: ['🐟 Fatty Fish (salmon, sardines)','🥜 Walnuts & Almonds','🫐 Berries','🥬 Leafy Greens','🥦 Broccoli','🌾 Whole Grains','🫒 Olive Oil','🧅 Turmeric & Ginger','🍵 Green Tea','🥛 Greek Yogurt','🫘 Legumes','🍊 Citrus Fruits'],
        avoid: ['🚫 Fried Foods','🚫 Processed Meats','🚫 Sugary Drinks','🚫 White Rice/Bread','🚫 Alcohol','🚫 Excess Salt','🚫 Red Meat (excess)','🚫 Nightshade Veggies (if sensitive)','🚫 Dairy (if sensitive)'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'30 min after lunch',dur:'8 hours',label:'🦴 Joint Care'
      },
      digestive: {
        home: ['Gentle Walking (15 min)','Cat-Cow Stretch (10)','Seated Twist (30s each)','Child\'s Pose (1 min)','Deep Breathing (5 min)','Butterfly Stretch (30s)','Neck Rolls (30s each)','Shoulder Rolls (20)','Ankle Rotations (20 each)','Seated Forward Fold (30s)','Standing Side Bends (30s each)','Supine Twist (30s each)','Knee-to-Chest (30s each)','Happy Baby Pose (30s)','Corpse Pose (5 min)'],
        gym: ['Treadmill Walk (15 min)','Stationary Bike (15 min)','Seated Chest Press (3x8)','Lat Pulldown (3x10)','Seated Cable Row (3x10)','Leg Press (3x12)','Elliptical (10 min)','Shoulder Press Machine (3x8)','Plank (3x15s)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Hip Abductor (3x10)','Seated Leg Curl (3x10)','Back Extension (3x8)','Cable Crunch (gentle, 3x8)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + banana + ginger + honey + almond milk'},{name:'Snack',desc:'Papaya + probiotic drink'},{name:'Lunch',desc:'Rice + dal + steamed zucchini + turmeric + cumin'},{name:'Snack',desc:'Coconut water + banana'},{name:'Dinner',desc:'Veg soup + khichdi (rice+lentil) + ghee (small)'}],
        meals_nv: [{name:'Breakfast',desc:'Oatmeal + banana + ginger + honey'},{name:'Snack',desc:'Papaya + probiotic drink'},{name:'Lunch',desc:'Grilled fish + steamed rice + zucchini + turmeric'},{name:'Snack',desc:'Coconut water + banana'},{name:'Dinner',desc:'Chicken soup + steamed veggies + small rice'}],
        eat: ['🍌 Bananas','🍚 White Rice (easy to digest)','🥬 Cooked Greens (not raw)','🫘 Lentils (soaked/cooked well)','🥔 Potatoes (cooked)','🍊 Papaya','🥥 Coconut Water','🧅 Ginger & Cumin','🥛 Probiotic Yogurt','🍚 Khichdi','🍵 Herbal Tea (peppermint, ginger)'],
        avoid: ['🚫 Spicy Foods','🚫 Fried Foods','🚫 Raw Salad (hard to digest)','🚫 Dairy (if sensitive)','🚫 Beans (if gas-prone)','🚫 Carbonated Drinks','🚫 Alcohol','🚫 Caffeine (excess)','🚫 Processed Foods','🚫 Citrus (excess acid)'],
        bed:'10:30 PM',wake:'6:30 AM',nap:'Not recommended',dur:'8 hours',label:'🌿 Digestive Health'
      },
      anemia: {
        home: ['Brisk Walking (15 min)','Bodyweight Squats (3x8)','Push-ups (3x8)','Glute Bridges (3x10)','Plank (3x15s)','Cat-Cow Stretch (10)','Seated Leg Raises (3x8)','Standing Calf Raises (3x10)','Arm Circles (30s)','Deep Breathing (5 min)','Chair Dips (3x8)','Wall Push-ups (3x8)','Knee Push-ups (3x6)','Marching in Place (3x20s)','Child\'s Pose (1 min)'],
        gym: ['Treadmill Walk (15 min)','Seated Chest Press (3x8)','Lat Pulldown (3x8)','Leg Press (3x10)','Seated Cable Row (3x8)','Stationary Bike (10 min)','Shoulder Press Machine (3x8)','Hip Abductor (3x8)','Plank (3x15s)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Back Extension (3x8)','Seated Leg Curl (3x8)','Cable Crunch (3x8)','Elliptical (10 min)'],
        meals_v: [{name:'Breakfast',desc:'Iron-fortified oatmeal + spinach + berries + pumpkin seeds + orange juice'},{name:'Snack',desc:'Dates + almonds + coconut water'},{name:'Lunch',desc:'Lentil soup + quinoa + roasted beetroot + leafy greens + lemon'},{name:'Snack',desc:'Pomegranate + walnuts'},{name:'Dinner',desc:'Palak tofu + brown rice + steamed veggies + vitamin C salad'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + whole grain toast + spinach + orange juice'},{name:'Snack',desc:'Dates + almonds + coconut water'},{name:'Lunch',desc:'Lean red meat + quinoa + spinach + beetroot + lemon'},{name:'Snack',desc:'Pomegranate + walnuts'},{name:'Dinner',desc:'Grilled chicken + leafy greens + sweet potato + vitamin C veggies'}],
        eat: ['🥬 Spinach & Leafy Greens','🥩 Red Meat (lean)','🥚 Eggs','🫘 Lentils & Beans','🥜 Pumpkin Seeds','🍇 Dried Fruits (dates, raisins)','🍊 Citrus Fruits (vitamin C)','🍎 Pomegranate','🧅 Beetroot','🌾 Iron-Fortified Grains','🥛 Tofu','🥜 Nuts'],
        avoid: ['🚫 Tea/Coffee with Meals (blocks iron)','🚫 Calcium Supplements with Iron','🚫 Fried Foods','🚫 Sugary Drinks','🚫 Processed Foods','🚫 Excess Dairy (calcium blocks iron)'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'30 min after lunch',dur:'8-9 hours',label:'🩸 Anemia Care'
      },
      heart: {
        home: ['Brisk Walking (30 min)','Cat-Cow Stretch (10)','Child\'s Pose (1 min)','Seated Twist (30s each)','Butterfly Stretch (30s)','Neck Rolls (30s each)','Shoulder Rolls (20)','Standing Calf Raises (3x12)','Marching in Place (3x30s)','Wall Push-ups (3x10)','Chair Dips (3x8)','Seated Leg Raises (3x10)','Deep Breathing (5 min)','Gentle Yoga (10 min)','Ankle Rotations (20 each)'],
        gym: ['Treadmill Walk (20 min)','Stationary Bike (15 min)','Seated Chest Press (3x10)','Lat Pulldown (3x10)','Leg Press (3x12)','Seated Cable Row (3x10)','Elliptical (15 min)','Shoulder Press Machine (3x8)','Hip Abductor (3x10)','Plank (3x20s)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Seated Leg Curl (3x10)','Back Extension (3x8)','Rowing Machine (10 min)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + walnuts + soy milk'},{name:'Snack',desc:'Apple + almonds + green tea'},{name:'Lunch',desc:'Quinoa + chickpea + avocado + leafy greens + lemon'},{name:'Snack',desc:'Greek yogurt + chia seeds + berries'},{name:'Dinner',desc:'Grilled tofu + steamed broccoli + sweet potato + olive oil'}],
        meals_nv: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + walnuts'},{name:'Snack',desc:'Apple + almonds + green tea'},{name:'Lunch',desc:'Grilled salmon + quinoa + leafy greens + avocado'},{name:'Snack',desc:'Greek yogurt + chia seeds + berries'},{name:'Dinner',desc:'Grilled chicken breast + steamed veggies + sweet potato'}],
        eat: ['🐟 Fatty Fish (salmon, mackerel)','🌾 Oats & Barley','🥜 Nuts (almonds, walnuts)','🥑 Avocado','🫒 Olive Oil','🥬 Leafy Greens','🫐 Berries','🫘 Legumes','🍵 Green Tea','🧄 Garlic','🌱 Flax & Chia Seeds','🍎 Apples & Citrus'],
        avoid: ['🚫 Trans Fats','🚫 Fried Foods','🚫 Red Meat (excess)','🚫 Processed Meats','🚫 Sugary Drinks','🚫 Excess Salt','🚫 Alcohol','🚫 Butter & Cream','🚫 Refined Carbs'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'20 min after lunch',dur:'7-8 hours',label:'💓 Heart Health'
      },
      liver: {
        home: ['Brisk Walking (25 min)','Cat-Cow Stretch (10)','Seated Twist (30s each)','Child\'s Pose (1 min)','Deep Breathing (5 min)','Butterfly Stretch (30s)','Standing Side Bends (30s each)','Neck Rolls (30s)','Shoulder Rolls (20)','Marching in Place (3x30s)','Knee Push-ups (3x8)','Chair Dips (3x8)','Ankle Rotations (20 each)','Gentle Yoga (10 min)','Corpse Pose (5 min)'],
        gym: ['Treadmill Walk (20 min)','Stationary Bike (15 min)','Seated Chest Press (3x10)','Lat Pulldown (3x10)','Leg Press (3x12)','Seated Cable Row (3x10)','Elliptical (15 min)','Shoulder Press Machine (3x8)','Hip Abductor (3x10)','Plank (3x20s)','Cable Crunch (3x10)','Seated Leg Curl (3x10)','Back Extension (3x8)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + walnuts + turmeric + almond milk'},{name:'Snack',desc:'Apple + green tea (no sugar)'},{name:'Lunch',desc:'Quinoa + chickpea + leafy greens + beetroot + lemon'},{name:'Snack',desc:'Cucumber + carrot sticks + hummus'},{name:'Dinner',desc:'Grilled tofu + broccoli + cauliflower rice + turmeric'}],
        meals_nv: [{name:'Breakfast',desc:'Oatmeal + berries + walnuts + turmeric'},{name:'Snack',desc:'Apple + green tea (no sugar)'},{name:'Lunch',desc:'Grilled fish + quinoa + leafy greens + beetroot'},{name:'Snack',desc:'Cucumber + carrot sticks'},{name:'Dinner',desc:'Grilled chicken breast + steamed broccoli + turmeric'}],
        eat: ['🥬 Leafy Greens','🧅 Turmeric','🫐 Berries','🥜 Walnuts','🫒 Olive Oil','🍵 Green Tea','🧄 Garlic','🍎 Apples','🥑 Avocado','🫘 Legumes','🍋 Lemon Water','🥦 Cruciferous Veggies'],
        avoid: ['🚫 Alcohol (COMPLETELY)','🚫 Fried Foods','🚫 Sugary Drinks','🚫 Processed Foods','🚫 Red Meat','🚫 White Rice/Bread','🚫 Excess Salt','🚫 Trans Fats','🚫 Artificial Sweeteners'],
        bed:'10:30 PM',wake:'6:00 AM',nap:'20 min after lunch',dur:'7-8 hours',label:'🫁 Liver Detox'
      },
      kidney: {
        home: ['Gentle Walking (15 min)','Cat-Cow Stretch (10)','Child\'s Pose (1 min)','Seated Twist (30s each)','Butterfly Stretch (30s)','Deep Breathing (5 min)','Neck Rolls (30s)','Shoulder Rolls (20)','Ankle Rotations (20 each)','Seated Leg Raises (3x8)','Arm Circles (30s)','Seated Hamstring Stretch (30s each)','Corpse Pose (5 min)','Seated Side Bends (30s each)','Legs-Up-The-Wall (5 min)'],
        gym: ['Stationary Bike (15 min)','Seated Chest Press (3x8)','Lat Pulldown (3x8)','Seated Cable Row (3x8)','Leg Press (3x10)','Shoulder Press Machine (3x8)','Hip Abductor (3x8)','Seated Leg Curl (3x8)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Plank (3x15s)','Back Extension (3x8)','Elliptical (10 min)','Seated Calf Raise (3x10)','Cable Crunch (3x8)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + apple + almond milk (low potassium if needed)'},{name:'Snack',desc:'Apple + cranberry juice (unsweetened)'},{name:'Lunch',desc:'Rice + steamed veggies + small salad + olive oil (portion-controlled)'},{name:'Snack',desc:'Cranberry + cucumber sticks'},{name:'Dinner',desc:'Grilled tofu + steamed zucchini + bell peppers + rice'}],
        meals_nv: [{name:'Breakfast',desc:'Egg white omelette + oatmeal + apple'},{name:'Snack',desc:'Apple + cranberry juice (unsweetened)'},{name:'Lunch',desc:'Grilled chicken (small portion) + rice + steamed veggies'},{name:'Snack',desc:'Cranberry + cucumber sticks'},{name:'Dinner',desc:'Grilled fish (small) + steamed zucchini + bell peppers'}],
        eat: ['🍎 Apples','🫐 Cranberries','🥬 Cabbage','🫑 Bell Peppers','🥒 Cucumber','🍚 White Rice (portion-controlled)','🥚 Egg Whites','🫒 Olive Oil','🍋 Lemon','🍵 Herbal Tea','🥦 Cauliflower (limited)','🍇 Grapes'],
        avoid: ['🚫 Excess Potassium Foods (bananas, potatoes, spinach)','🚫 Excess Phosphorus (dairy, nuts, cola)','🚫 Excess Salt','🚫 Processed Foods','🚫 Red Meat','🚫 Alcohol','🚫 Sugary Drinks','🚫 Canned Foods','🚫 Pickled/Preserved Foods'],
        bed:'10:00 PM',wake:'6:00 AM',nap:'20 min after lunch',dur:'7-8 hours',label:'🫘 Kidney Care'
      },
      stress: {
        home: ['Yoga Flow (20 min)','Deep Breathing (10 min)','Cat-Cow Stretch (10)','Child\'s Pose (2 min)','Seated Twist (30s each)','Legs-Up-The-Wall (5 min)','Butterfly Stretch (30s)','Neck Rolls (30s each)','Shoulder Rolls (20)','Corpse Pose (5 min)','Standing Forward Bend (30s)','Gentle Walking (15 min)','Sun Salutation (5 cycles)','Happy Baby Pose (30s)','Supine Twist (30s each)'],
        gym: ['Treadmill Walk (20 min)','Stationary Bike (15 min)','Seated Chest Press (3x10)','Lat Pulldown (3x10)','Seated Cable Row (3x10)','Leg Press (3x12)','Elliptical (15 min)','Shoulder Press Machine (3x8)','Hip Abductor (3x10)','Plank (3x20s)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Seated Leg Curl (3x10)','Back Extension (3x8)','Cable Crunch (3x10)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + banana + walnuts + honey'},{name:'Snack',desc:'Dark chocolate (70%+) + green tea'},{name:'Lunch',desc:'Quinoa + chickpea + avocado + leafy greens + lemon'},{name:'Snack',desc:'Chamomile tea + almonds'},{name:'Dinner',desc:'Grilled tofu + sweet potato + steamed broccoli + olive oil'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + avocado toast + berries + honey'},{name:'Snack',desc:'Dark chocolate (70%+) + green tea'},{name:'Lunch',desc:'Grilled salmon + quinoa + leafy greens + avocado'},{name:'Snack',desc:'Chamomile tea + almonds'},{name:'Dinner',desc:'Grilled chicken + sweet potato + steamed veggies'}],
        eat: ['🐟 Fatty Fish (salmon)','🥑 Avocado','🫐 Berries','🍌 Bananas','🥜 Nuts & Seeds','🌾 Whole Grains','🍫 Dark Chocolate (70%+)','🍵 Chamomile/Green Tea','🥬 Leafy Greens','🫘 Legumes','🍊 Citrus','🥛 Warm Turmeric Milk'],
        avoid: ['🚫 Excess Caffeine','🚫 Alcohol','🚫 Sugary Drinks','🚫 Fried Foods','🚫 Processed Carbs','🚫 Energy Drinks','🚫 Excess Sugar','🚫 Spicy Food (before bed)'],
        bed:'9:30 PM',wake:'6:00 AM',nap:'20 min after lunch',dur:'8-9 hours',label:'🧘 Stress Relief'
      },
      skin_hair: {
        home: ['Brisk Walking (20 min)','Bodyweight Squats (3x12)','Push-ups (3x10)','Glute Bridges (3x12)','Plank (3x20s)','Cat-Cow Stretch (10)','Seated Twist (30s each)','Neck Rolls (30s)','Shoulder Rolls (20)','Sun Salutation (5 cycles)','Standing Calf Raises (3x12)','Lunges (3x8 each)','Chair Dips (3x8)','Arm Circles (30s)','Deep Breathing (5 min)'],
        gym: ['Treadmill Walk (20 min)','Seated Chest Press (3x10)','Lat Pulldown (3x10)','Seated Cable Row (3x10)','Leg Press (3x12)','Stationary Bike (15 min)','Shoulder Press Machine (3x8)','Hip Abductor (3x10)','Plank (3x20s)','Cable Bicep Curl (3x8)','Tricep Pushdown (3x8)','Seated Leg Curl (3x10)','Back Extension (3x8)','Elliptical (12 min)','Cable Crunch (3x10)'],
        meals_v: [{name:'Breakfast',desc:'Oatmeal + berries + flax seeds + almonds + vitamin C fruit'},{name:'Snack',desc:'Handful of mixed nuts + green tea'},{name:'Lunch',desc:'Quinoa + chickpea + spinach + bell peppers + avocado'},{name:'Snack',desc:'Greek yogurt + berries + honey'},{name:'Dinner',desc:'Grilled tofu + broccoli + sweet potato + sesame seeds'}],
        meals_nv: [{name:'Breakfast',desc:'Eggs (2) + avocado + whole grain toast + berries'},{name:'Snack',desc:'Mixed nuts + green tea'},{name:'Lunch',desc:'Grilled salmon + quinoa + spinach + bell peppers'},{name:'Snack',desc:'Greek yogurt + berries + honey'},{name:'Dinner',desc:'Grilled chicken + sweet potato + steamed broccoli'}],
        eat: ['🐟 Fatty Fish (salmon)','🥚 Eggs','🥑 Avocado','🥜 Nuts & Seeds (flax, chia, sunflower)','🫐 Berries','🥬 Spinach & Leafy Greens','🍊 Citrus Fruits (vitamin C)','🥛 Greek Yogurt','🫒 Olive Oil','🍫 Dark Chocolate','🍵 Green Tea','🥕 Carrots & Bell Peppers'],
        avoid: ['🚫 Sugary Drinks','🚫 Fried Foods','🚫 Excess Dairy','🚫 Processed Carbs','🚫 Alcohol','🚫 Excess Salt','🚫 Spicy Food (acne-prone)','🚫 Caffeine (excess)'],
        bed:'10:30 PM',wake:'6:30 AM',nap:'20 min after lunch',dur:'8 hours',label:'✨ Skin & Hair Glow'
      }
    };

    // ===== HOME WORKOUT =====
    var menstruationPool = ['Gentle Yoga Stretch (15 min)','Deep Breathing (5 min)','Pelvic Tilts (3x12)','Cat-Cow Stretch (10 reps)','Child\'s Pose Hold (2 min)','Light Walking (15 min)','Seated Spinal Twist (30s each)','Legs-Up-The-Wall (5 min)','Knee-to-Chest Stretch (30s each)','Supine Twist (30s each)','Happy Baby Pose (30s)','Butterfly Stretch (30s)','Neck Rolls (30s each)','Shoulder Rolls (20 reps)','Ankle Rotations (20 each)','Wrist Stretches (30s each)','Foam Rolling Lower Back (5 min)','Corpse Pose (5 min)','Standing Forward Bend (30s)','Side Bends (30s each)','Gentle Hip Circles (30s each)','Seated Forward Fold (30s)','Cobra Stretch (30s)','Sphinx Pose (30s)','Supine Hamstring Stretch (30s each)'];
    if (isMenstruating) {
      var homeEx = pick(7, menstruationPool);
      var homeEl = $('homeWorkoutList'); if (homeEl) homeEl.innerHTML = homeEx.map(function(e) { return '<li>' + e + '</li>'; }).join('');
      var gymEx = pick(7, menstruationPool);
      var gymEl = $('gymWorkoutList'); if (gymEl) gymEl.innerHTML = gymEx.map(function(e) { return '<li>' + e + '</li>'; }).join('');
    } else if (problem !== 'general' && problemData[problem]) {
      var pd = problemData[problem];
      var pHome = pick(7, pd.home);
      var homeEl = $('homeWorkoutList'); if (homeEl) homeEl.innerHTML = pHome.map(function(e) { return '<li>' + e + '</li>'; }).join('');
      var pGym = pick(7, pd.gym);
      var gymEl = $('gymWorkoutList'); if (gymEl) gymEl.innerHTML = pGym.map(function(e) { return '<li>' + e + '</li>'; }).join('');
    } else {
      var homePools = {
        seniorYoung: ['Brisk Walking (20 min)','Bodyweight Squats (3x10)','Wall Push-ups (3x10)','Seated Leg Raises (3x12)','Standing Calf Raises (3x15)','Cat-Cow Stretch (10 reps)','Arm Circles (30s each)','Chair Dips (3x10)','Marching in Place (3x30s)','Knee Push-ups (3x8)','Bird Dog (3x8 each)','Heel Raises (3x15)','Side Leg Raises (3x10 each)','Seated Twist (10 each)','Toe Touches (3x10)'],
        overweight: ['Walking Lunges (3x12)','Incline Push-ups (3x12)','Bodyweight Squats (3x15)','Glute Bridges (3x15)','Plank (3x25s)','Step-ups on Chair (3x10 each)','Arm Circles with Light Weights (3x12)','Bird Dog (3x10 each)','Wall Sit (3x20s)','Standing Calf Raises (3x20)','Seated Band Rows (3x12)','Knee Push-ups (3x10)','Side Steps (3x12 each)','Donkey Kicks (3x12 each)','Slow Mountain Climbers (3x20s)'],
        activeAdult: ['Burpees (3x12)','Pike Push-ups (3x10)','Bulgarian Split Squats (3x10 each)','Diamond Push-ups (3x8)','Handstand Hold (3x15s)','Pistol Squats (3x6 each)','Mountain Climbers (3x30s)','Box Jumps (3x10)','Archer Push-ups (3x6 each)','Single-Leg Deadlift (3x8 each)','Dragon Flags (3x6)','Jump Lunges (3x10 each)','Clapping Push-ups (3x8)','Tuck Jumps (3x10)','L-Sit Hold (3x10s)'],
        underweight: ['Bodyweight Squats (3x12)','Push-ups (3x12)','Lunges (3x10 each)','Plank (3x25s)','Glute Bridges (3x15)','Crunches (3x15)','Jumping Jacks (3x25)','Calf Raises (3x20)','Diamond Push-ups (3x8)','Bicycle Crunches (3x15 each)','Reverse Lunges (3x10 each)','Side Plank (3x15s each)','Squat Jumps (3x8)','Tricep Dips on Chair (3x10)','High Knees (3x25s)'],
        normal: ['Push-ups (3x15)','Bodyweight Squats (3x18)','Plank (3x35s)','Lunges (3x12 each)','Glute Bridges (3x18)','Calf Raises (3x25)','High Knees (3x35s)','Tricep Dips (3x12)','Mountain Climbers (3x25s)','Side Plank (3x20s each)','Squat Pulses (3x15)','Jump Squats (3x10)','Push-up Hold (3x15s)','Flutter Kicks (3x20 each)','Tabletop Rows (3x10 each)']
      };
      var homePool;
      if (isSenior || isYoung) homePool = homePools.seniorYoung;
      else if (isOverweightBMI || isHeavy) homePool = homePools.overweight;
      else if (isActive && isAdult) homePool = homePools.activeAdult;
      else if (isUnderweight) homePool = homePools.underweight;
      else homePool = homePools.normal;
      var homeEx = pick(7, homePool);
      var homeEl = $('homeWorkoutList'); if (homeEl) homeEl.innerHTML = homeEx.map(function(e) { return '<li>' + e + '</li>'; }).join('');
    }

    // --- GYM WORKOUT ---
    if (!isMenstruating && !(problem !== 'general' && problemData[problem])) {
      var gymPools = {
        senior: ['Treadmill Walk (20 min)','Seated Chest Press (3x10)','Leg Press Machine (3x12)','Lat Pulldown (3x10)','Seated Row (3x10)','Hip Abductor Machine (3x12)','Stationary Bike (15 min)','Cable Bicep Curl (3x10)','Tricep Pushdown (3x10)','Shoulder Press Machine (3x10)','Chest Fly Machine (3x10)','Leg Curl Machine (3x12)','Elliptical (15 min)','Seated Calf Raise (3x15)','Back Extension (3x10)'],
        young: ['Bodyweight Squats (3x12)','Dumbbell Bench Press (3x10)','Lat Pulldown (3x10)','Leg Press (3x12)','Plank (3x25s)','Cycling (15 min)','Light Deadlifts (3x8)','Dumbbell Row (3x10 each)','Cable Crossovers (3x10)','Leg Extension (3x12)','Hammer Curls (3x10)','Overhead Tricep (3x10)','Face Pulls (3x12)','Kettlebell Swings (3x12)','Farmers Walk (30s)'],
        overweight: ['Treadmill Walk (20 min incline)','Lat Pulldown (3x12)','Leg Press (3x15)','Seated Cable Row (3x12)','Chest Press Machine (3x12)','Cable Crunch (3x15)','Elliptical (15 min)','Hip Adductor (3x15)','Shoulder Press Machine (3x12)','Leg Curl (3x15)','Seated Dip Machine (3x12)','Stair Climber (10 min)','Plank (3x20s)','Chest Fly (3x12)','Bicep Curl Machine (3x12)'],
        activeMale: ['Deadlift (4x8)','Bench Press (4x8)','Barbell Row (4x8)','Overhead Press (4x8)','Back Squat (4x8)','Pull-ups (3x8)','HIIT Finisher (15 min)','Incline Bench (4x8)','Weighted Dips (3x10)','Barbell Shrugs (3x12)','Front Squat (4x6)','Pendlay Row (4x8)','Clean & Press (3x6)','Rack Pulls (3x8)','Chin-ups (3x8)'],
        activeFemale: ['Squats (4x10)','Dumbbell Bench Press (4x10)','Romanian Deadlift (4x10)','Lat Pulldown (4x10)','Hip Thrusts (4x12)','Dumbbell Shoulder Press (3x10)','Plank (3x40s)','Walking Lunges (3x12 each)','Cable Kickbacks (3x15 each)','Leg Press (4x12)','Seated Row (4x10)','Bulgarian Split Squats (3x10 each)','Glute Bridge Machine (4x12)','Lateral Raises (3x12)','Step-ups (3x10 each)'],
        underweightMale: ['Squats (4x10)','Bench Press (4x10)','Barbell Row (4x10)','Overhead Press (3x10)','Deadlift (3x8)','Pull-ups (3x6)','Bicep Curls (3x12)','Dumbbell Fly (3x10)','Tricep Pushdown (3x12)','Leg Press (4x12)','Face Pulls (3x12)','Dumbbell Shrugs (3x12)','Cable Crunch (3x12)','Farmers Walk (3x30s)','Hammer Curls (3x10)'],
        underweightFemale: ['Goblet Squats (4x10)','Dumbbell Bench Press (4x10)','Seated Cable Row (4x10)','Leg Press (4x12)','Dumbbell RDL (3x12)','Lat Pulldown (3x10)','Glute Kickbacks (3x12)','Hip Thrusts (4x12)','Standing Calf Raises (3x15)','Cable Crossovers (3x10)','Dumbbell Lunges (3x10 each)','Plank (3x25s)','Step-ups (3x10 each)','Bicep Curls (3x10)','Lateral Raises (3x10)'],
        normal: ['Dumbbell Press (3x12)','Lat Pulldown (3x12)','Leg Press (3x15)','Dumbbell Row (3x12)','Plank (3x30s)','Cycling (20 min)','Cable Crossovers (3x12)','Tricep Pushdown (3x12)','Hammer Curls (3x12)','Face Pulls (3x15)','Walking Lunges (3x12 each)','Leg Curl (3x15)','Shoulder Press (3x10)','Cable Crunch (3x15)','Hip Thrusts (3x15)']
      };
      var gymPool;
      if (isSenior) gymPool = gymPools.senior;
      else if (isYoung) gymPool = gymPools.young;
      else if (isOverweightBMI) gymPool = gymPools.overweight;
      else if (isActive && isAdult) gymPool = isMale ? gymPools.activeMale : gymPools.activeFemale;
      else if (isUnderweight) gymPool = isMale ? gymPools.underweightMale : gymPools.underweightFemale;
      else gymPool = gymPools.normal;
      var gymEx = pick(7, gymPool);
      var gymEl = $('gymWorkoutList'); if (gymEl) gymEl.innerHTML = gymEx.map(function(e) { return '<li>' + e + '</li>'; }).join('');
    }

    // --- MEAL PLAN ---
    var isVeg = diet === 'veg';
    var dietBadge = $('dietBadge');
    if (dietBadge) {
      if (isMenstruating) {
        dietBadge.textContent = isVeg ? '🌸 Menstruation · Veg' : '🌸 Menstruation · Non-Veg';
        dietBadge.style.background = 'rgba(139,108,247,0.12)';
        dietBadge.style.color = '#b794f7';
        dietBadge.style.borderColor = 'rgba(139,108,247,0.3)';
      } else if (problem !== 'general' && problemData[problem]) {
        dietBadge.textContent = problemData[problem].label;
        dietBadge.style.background = 'rgba(0,232,135,0.08)';
        dietBadge.style.color = 'var(--green)';
        dietBadge.style.borderColor = 'rgba(0,232,135,0.3)';
      } else {
        dietBadge.textContent = isVeg ? '🌱 Vegetarian' : '🥟 Non-Vegetarian';
        dietBadge.style.background = isVeg ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)';
        dietBadge.style.color = isVeg ? '#10b981' : '#ef4444';
        dietBadge.style.borderColor = isVeg ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
      }
    }
    var meals;
    if (isMenstruating) {
      meals = [
        { name: 'Breakfast', desc: 'Iron-rich oatmeal + spinach + berries + pumpkin seeds' },
        { name: 'Morning Snack', desc: 'Dark chocolate (70%+) + almonds + banana' },
        { name: 'Lunch', desc: isVeg ? 'Lentil soup + quinoa + roasted beetroot + leafy greens' : 'Grilled salmon + quinoa + spinach + roasted sweet potato' },
        { name: 'Evening Snack', desc: 'Warm turmeric milk + dates + walnuts' },
        { name: 'Dinner', desc: isVeg ? 'Steamed veggies + brown rice + tofu + sesame seeds' : 'Chicken soup + steamed veggies + brown rice' }
      ];
    } else if (problem !== 'general' && problemData[problem]) {
      meals = isVeg ? problemData[problem].meals_v : problemData[problem].meals_nv;
    } else if (isYoung || isUnderweight) {
      meals = isVeg ? [
        { name: 'Breakfast', desc: 'Oatmeal + banana + peanut butter + soy milk' },
        { name: 'Morning Snack', desc: 'Fruit smoothie with plant protein powder' },
        { name: 'Lunch', desc: 'Chickpea wrap + avocado + veggies + yogurt' },
        { name: 'Evening Snack', desc: 'Trail mix + apple' },
        { name: 'Dinner', desc: 'Paneer curry + rice + mixed veggies + dal' }
      ] : [
        { name: 'Breakfast', desc: 'Whole grain cereal + milk + banana + peanut butter toast' },
        { name: 'Morning Snack', desc: 'Fruit smoothie with protein powder' },
        { name: 'Lunch', desc: 'Chicken wrap with veggies + cheese + yogurt' },
        { name: 'Evening Snack', desc: 'Trail mix + apple' },
        { name: 'Dinner', desc: 'Grilled chicken + mashed potatoes + mixed veggies' }
      ];
    } else if (isSenior) {
      meals = isVeg ? [
        { name: 'Breakfast', desc: 'Oatmeal with berries + boiled eggs (2) + toast' },
        { name: 'Morning Snack', desc: 'Banana + handful of walnuts' },
        { name: 'Lunch', desc: 'Dal + steamed veggies + small portion rice + paneer' },
        { name: 'Evening Snack', desc: 'Greek yogurt + honey' },
        { name: 'Dinner', desc: 'Light veg soup + veg salad + grilled tofu' }
      ] : [
        { name: 'Breakfast', desc: 'Oatmeal with berries + boiled eggs (2)' },
        { name: 'Morning Snack', desc: 'Banana + handful of walnuts' },
        { name: 'Lunch', desc: 'Grilled fish + steamed veggies + small portion rice' },
        { name: 'Evening Snack', desc: 'Greek yogurt + honey' },
        { name: 'Dinner', desc: 'Light soup + grilled chicken salad' }
      ];
    } else if (isOverweightBMI) {
      meals = isVeg ? [
        { name: 'Breakfast', desc: 'Oatmeal with berries + green tea + sprouts' },
        { name: 'Morning Snack', desc: 'Apple with almonds (10)' },
        { name: 'Lunch', desc: 'Quinoa salad + chickpeas + cucumber + lemon dressing' },
        { name: 'Evening Snack', desc: 'Greek yogurt + chia seeds' },
        { name: 'Dinner', desc: 'Grilled tofu + broccoli + cauliflower rice + stir-fry' }
      ] : [
        { name: 'Breakfast', desc: 'Oatmeal with berries + green tea' },
        { name: 'Morning Snack', desc: 'Apple with almonds (10)' },
        { name: 'Lunch', desc: 'Grilled chicken salad + quinoa + lemon dressing' },
        { name: 'Evening Snack', desc: 'Greek yogurt + chia seeds' },
        { name: 'Dinner', desc: 'Steamed fish + broccoli + cauliflower rice' }
      ];
    } else if (isActive) {
      meals = isVeg ? [
        { name: 'Breakfast', desc: 'Scrambled eggs (4) + avocado toast + oats' },
        { name: 'Morning Snack', desc: 'Plant protein shake + banana + peanut butter' },
        { name: 'Lunch', desc: 'Paneer (200g) + quinoa + broccoli + bell peppers' },
        { name: 'Evening Snack', desc: 'Greek yogurt + almonds + berries' },
        { name: 'Dinner', desc: 'Tofu steak + sweet potato + grilled veggies' }
      ] : isMale ? [
        { name: 'Breakfast', desc: 'Egg white omelette (4 eggs) + avocado + oats' },
        { name: 'Morning Snack', desc: 'Protein shake + banana + peanut butter' },
        { name: 'Lunch', desc: 'Chicken breast (200g) + brown rice + broccoli' },
        { name: 'Evening Snack', desc: 'Cottage cheese + almonds + berries' },
        { name: 'Dinner', desc: 'Lean steak (200g) + sweet potato + asparagus' }
      ] : [
        { name: 'Breakfast', desc: 'Scrambled eggs (3) + whole grain toast + avocado' },
        { name: 'Morning Snack', desc: 'Greek yogurt + granola + berries' },
        { name: 'Lunch', desc: 'Grilled chicken salad + quinoa + mixed greens' },
        { name: 'Evening Snack', desc: 'Protein bar + apple' },
        { name: 'Dinner', desc: 'Grilled salmon + roasted veggies + small sweet potato' }
      ];
    } else {
      meals = isVeg ? [
        { name: 'Breakfast', desc: 'Smoothie bowl + granola + chia seeds + almonds' },
        { name: 'Morning Snack', desc: 'Mixed nuts + banana' },
        { name: 'Lunch', desc: 'Quinoa + chickpea + paneer bowl + greens' },
        { name: 'Evening Snack', desc: 'Hummus + veggie sticks + pita' },
        { name: 'Dinner', desc: 'Vegetable stir-fry + rice + dal + salad' }
      ] : isMale ? [
        { name: 'Breakfast', desc: 'Scrambled eggs (3) + whole grain toast + fruit' },
        { name: 'Morning Snack', desc: 'Mixed nuts (30g) + banana' },
        { name: 'Lunch', desc: 'Turkey sandwich + side salad + yogurt' },
        { name: 'Evening Snack', desc: 'Cottage cheese + pineapple' },
        { name: 'Dinner', desc: 'Grilled fish + roasted potatoes + green beans' }
      ] : [
        { name: 'Breakfast', desc: 'Smoothie bowl + granola + chia seeds' },
        { name: 'Morning Snack', desc: 'Rice cakes + avocado' },
        { name: 'Lunch', desc: 'Quinoa salad + chickpeas + feta + greens' },
        { name: 'Evening Snack', desc: 'Hummus + veggie sticks' },
        { name: 'Dinner', desc: 'Baked chicken + roasted veggies + small salad' }
      ];
    }
    var mealEl = $('mealPlan'); if (mealEl) mealEl.innerHTML = meals.map(function(m) {
      return '<div class="meal-item"><div class="meal-name">' + m.name + '</div><div class="meal-desc">' + m.desc + '</div></div>';
    }).join('');

    // --- FOODS TO EAT ---
    var eat, eatLabel = $('foodsEatLabel');
    if (isMenstruating) {
      eat = ['🥬 Spinach & Leafy Greens', '🥚 Eggs', '🐟 Fatty Fish (salmon/sardines)', '🍫 Dark Chocolate (70%+)', '🍌 Bananas', '🥜 Pumpkin Seeds & Almonds', '🫘 Lentils & Beans', '🫐 Berries', '🧀 Tofu', '🌾 Whole Grains', '🥛 Warm Turmeric Milk', '🍵 Ginger Tea'];
    } else if (problem !== 'general' && problemData[problem]) {
      eat = problemData[problem].eat;
    } else if (isVeg) {
      if (isUnderweight) {
        eat = ['🥚 Eggs', '🧀 Paneer', '🥜 Nuts & Butters', '🥑 Avocado', '🍌 Bananas', '🌾 Whole Grains', '🥛 Full-Fat Dairy', '🍇 Dried Fruits'];
      } else if (isSenior) {
        eat = ['🥬 Leafy Greens', '🥚 Eggs', '🫐 Berries', '🥜 Nuts', '🌾 Whole Grains', '🥛 Greek Yogurt', '🧀 Tofu', '🫒 Olive Oil'];
      } else if (isOverweightBMI) {
        eat = ['🥬 Leafy Greens', '🧀 Paneer', '🫐 Berries', '🥜 Nuts (limited)', '🌾 Quinoa', '🍵 Green Tea', '🥦 Cruciferous Veggies', '🌱 Sprouts'];
      } else if (isActive) {
        eat = ['🥚 Eggs', '🥛 Greek Yogurt', '🍌 Bananas', '🌾 Oats', '🍚 Brown Rice', '🍠 Sweet Potato', '🥬 Spinach', '🌱 Plant Protein'];
      } else {
        eat = ['🥚 Eggs', '🧀 Paneer', '🍌 Bananas', '🌾 Oats', '🍚 Brown Rice', '🍠 Sweet Potato', '🥬 Spinach', '🥜 Mixed Nuts', '🫘 Lentils'];
      }
    } else {
      if (isUnderweight) {
        eat = ['🥚 Eggs', '🥩 Red Meat', '🥜 Nuts & Butters', '🥑 Avocado', '🍌 Bananas', '🌾 Whole Grains', '🥛 Full-Fat Dairy', '🍗 Chicken'];
      } else if (isSenior) {
        eat = ['🥬 Leafy Greens', '🍗 Lean Chicken', '🐟 Fatty Fish', '🫐 Berries', '🥜 Nuts', '🌾 Whole Grains', '🥛 Greek Yogurt', '🫒 Olive Oil'];
      } else if (isOverweightBMI) {
        eat = ['🥬 Leafy Greens', '🍗 Lean Chicken', '🐟 Fish', '🫐 Berries', '🥜 Nuts (limited)', '🌾 Quinoa', '🍵 Green Tea', '🥦 Cruciferous Veggies'];
      } else if (isActive) {
        eat = ['🥚 Eggs', '🍗 Chicken Breast', '🥩 Lean Steak', '🍌 Bananas', '🌾 Oats', '🍚 Brown Rice', '🍠 Sweet Potato', '🥬 Spinach'];
      } else {
        eat = ['🥚 Eggs', '🍗 Chicken Breast', '🐟 Fish', '🍌 Bananas', '🌾 Oats', '🍚 Brown Rice', '🍠 Sweet Potato', '🥬 Spinach', '🥜 Mixed Nuts'];
      }
    }
    if (eatLabel) eatLabel.textContent = isMenstruating ? '🌸 Iron-Rich & Soothing Foods' : (problem !== 'general' && problemData[problem]) ? '🎯 Targeted Nutrition' : isVeg ? '🌱 Vegetarian Options' : '🥩 Non-Vegetarian Options';

    // --- FOODS TO AVOID ---
    var avoid;
    if (isMenstruating) {
      avoid = ['🚫 Excess Caffeine', '🚫 Sugary Drinks', '🚫 Fried/Oily Foods', '🚫 Spicy Food', '🚫 Alcohol', '🚫 Cold Drinks/Ice Cream', '🚫 Excess Salt (causes bloating)', '🚫 Dairy (if sensitive)'];
    } else if (problem !== 'general' && problemData[problem]) {
      avoid = problemData[problem].avoid;
    } else if (isVeg) {
      if (isUnderweight) {
        avoid = ['🚫 Junk Food', '🚫 Sugary Drinks', '🚫 Excess Caffeine', '🚫 Raw Salad (fill up on calories first)', '🚫 Artificial Sweeteners'];
      } else if (isSenior) {
        avoid = ['🚫 Excess Salt', '🚫 Sugary Drinks', '🚫 Raw Undercooked Foods', '🚫 Fried Items', '🚫 Processed Snacks', '🚫 Alcohol'];
      } else if (isOverweightBMI) {
        avoid = ['🚫 Sugar-Sweetened Beverages', '🚫 Fried Foods', '🚫 White Rice/Bread', '🚫 High-Sugar Fruits', '🚫 Packaged Snacks', '🚫 Alcohol', '🚫 Excess Oil'];
      } else if (isActive) {
        avoid = ['🚫 Sugary Drinks', '🚫 Fried Foods', '🚫 Processed Snacks', '🚫 Excess Salt', '🚫 Alcohol', '🚫 Artificial Sweeteners', '🚫 Trans Fats'];
      } else {
        avoid = ['🚫 Sugary Drinks', '🚫 Fried Foods', '🚫 White Bread/Pasta', '🚫 Packaged Snacks', '🚫 Excess Salt', '🚫 Alcohol', '🚫 Artificial Sweeteners'];
      }
    } else {
      if (isUnderweight) {
        avoid = ['🚫 Junk Food (empty calories)', '🚫 Sugary Drinks', '🚫 Excess Caffeine', '🚫 Lean Cuts Only (need fats)', '🚫 Artificial Sweeteners'];
      } else if (isSenior) {
        avoid = ['🚫 Processed Meats', '🚫 Excess Salt', '🚫 Sugary Drinks', '🚫 Fried Foods', '🚫 Raw Undercooked Meats', '🚫 Alcohol'];
      } else if (isOverweightBMI) {
        avoid = ['🚫 Fatty Red Meats', '🚫 Sugary Drinks', '🚫 Fried Foods', '🚫 White Rice/Bread', '🚫 Processed Meats (bacon,sausage)', '🚫 Alcohol', '🚫 High-Calorie Sauces'];
      } else if (isActive) {
        avoid = ['🚫 Processed Meats', '🚫 Sugary Drinks', '🚫 Fried Foods', '🚫 Excess Salt', '🚫 Alcohol', '🚫 Trans Fats', '🚫 Artificial Sweeteners'];
      } else {
        avoid = ['🚫 Processed Meats', '🚫 Sugary Drinks', '🚫 Fried Foods', '🚫 White Bread/Pasta', '🚫 Excess Salt', '🚫 Alcohol', '🚫 Artificial Sweeteners'];
      }
    }
    var eatEl = $('foodsEat'); if (eatEl) eatEl.innerHTML = eat.map(function(f) { return '<span class="food-tag">' + f + '</span>'; }).join('');
    var avEl = $('foodsAvoid'); if (avEl) avEl.innerHTML = avoid.map(function(f) { return '<span class="food-tag">' + f + '</span>'; }).join('');

    // --- SLEEP SCHEDULE (personalized) ---
    var bedHour, bedMin, wakeHour, wakeMin, bedLabel, wakeLabel, napLabel, durLabel;
    if (isMenstruating) {
      bedHour = 21; bedMin = 0; wakeHour = 5; wakeMin = 0; bedLabel = '9:00 PM'; wakeLabel = '5:00 AM'; napLabel = '30-45 min after 12 PM'; durLabel = '8-9 hours';
    } else if (problem !== 'general' && problemData[problem]) {
      var ps = problemData[problem];
      var parts = ps.bed.split(':');
      bedHour = parseInt(parts[0]); bedMin = parseInt(parts[1]) || 0;
      var wparts = ps.wake.split(':');
      wakeHour = parseInt(wparts[0]); wakeMin = parseInt(wparts[1]) || 0;
      bedLabel = ps.bed.indexOf('PM') !== -1 || ps.bed.indexOf('AM') !== -1 ? ps.bed : ps.bed;
      wakeLabel = ps.wake.indexOf('PM') !== -1 || ps.wake.indexOf('AM') !== -1 ? ps.wake : ps.wake;
      napLabel = ps.nap; durLabel = ps.dur;
    } else if (isActive) {
      bedHour = 21; bedMin = 30; wakeHour = 5; wakeMin = 30; bedLabel = '9:30 PM'; wakeLabel = '5:30 AM'; napLabel = '20 min after 1 PM'; durLabel = '8 hours';
    } else if (isSenior) {
      bedHour = 21; bedMin = 0; wakeHour = 5; wakeMin = 0; bedLabel = '9:00 PM'; wakeLabel = '5:00 AM'; napLabel = '30 min after 12 PM'; durLabel = '8 hours';
    } else if (isYoung) {
      bedHour = 21; bedMin = 30; wakeHour = 6; wakeMin = 30; bedLabel = '9:30 PM'; wakeLabel = '6:30 AM'; napLabel = 'Not needed'; durLabel = '8 hours';
    } else if (isOverweightBMI) {
      bedHour = 22; bedMin = 0; wakeHour = 6; wakeMin = 0; bedLabel = '10:00 PM'; wakeLabel = '6:00 AM'; napLabel = '20 min after 2 PM'; durLabel = '8 hours';
    } else {
      bedHour = 22; bedMin = 30; wakeHour = 6; wakeMin = 30; bedLabel = '10:30 PM'; wakeLabel = '6:30 AM'; napLabel = '20 min after 2 PM'; durLabel = '8 hours';
    }
    var sleep = [
      { label: 'Bedtime', time: bedLabel },
      { label: 'Wake Up', time: wakeLabel },
      { label: 'Duration', time: durLabel },
      { label: 'Nap (optional)', time: napLabel }
    ];
    var sleepEl = $('sleepSchedule'); if (sleepEl) sleepEl.innerHTML = sleep.map(function(s) {
      return '<div class="sleep-item"><span>' + s.label + '</span><span class="sleep-time">' + s.time + '</span></div>';
    }).join('');

    // Store sleep/wake times for notifications
    var notifSettings = safeJSON('fithomey_notif_settings', {});
    notifSettings.bedHour = bedHour; notifSettings.bedMin = bedMin;
    notifSettings.wakeHour = wakeHour; notifSettings.wakeMin = wakeMin;
    notifSettings.waterInterval = notifSettings.waterInterval || 60;
    notifSettings.workoutHour = notifSettings.workoutHour || (isActive ? 6 : 7);
    notifSettings.workoutMin = notifSettings.workoutMin || 0;
    notifSettings.notifsEnabled = notifSettings.notifsEnabled || false;
    safeSet('fithomey_notif_settings', JSON.stringify(notifSettings));

    // --- HABITS (personalized) ---
    var habits;
    if (isSenior) {
      habits = ['Walk 30 min daily', 'Stretch 10 min every morning', 'Drink 2L water', 'Take calcium & vitamin D', 'Sleep by 9 PM', 'Stay socially active', 'Light strength training 3x/week'];
    } else if (isYoung) {
      habits = ['Stay active 5x/week', 'Eat enough protein for growth', 'Drink milk daily', 'Limit screen time', 'Sleep 8-9 hours', 'Play outdoor sports', 'Drink 2L water'];
    } else if (isOverweightBMI) {
      habits = ['Walk 10,000 steps daily', 'Drink 8-10 glasses of water', 'No sugar after 6 PM', '30 min exercise daily', 'Eat slowly and mindfully', 'Track your calories', 'Sleep by 10 PM'];
    } else if (isActive) {
      habits = ['Train 5-6 days a week', 'Consume 1.6-2g protein per kg', 'Stretch 10 min post-workout', 'Meditate 10 min daily', 'Track macros', 'Take rest days seriously', 'Stay hydrated throughout day'];
    } else {
      habits = ['Exercise 4 days a week', 'Eat protein with every meal', 'Walk 8,000 steps daily', 'Drink 8 glasses of water', 'Sleep 7-8 hours', 'Limit screen time before bed', 'Meal prep on Sundays'];
    }
    var habEl = $('habitsList'); if (habEl) habEl.innerHTML = habits.map(function(h) { return '<li>' + h + '</li>'; }).join('');
  }

  // ===== PLAN TABS =====
  document.querySelectorAll('.plan-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.plan-tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.plan-content').forEach(function(c) { c.classList.remove('active'); });
      tab.classList.add('active');
      var target = $('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // ===== CHATBOT — EXTREME EDITION =====
  if (chatbotBtn && chatbotWindow && chatInput && chatSend && chatMessages) {

    // --- Context & Memory ---
    var chatContext = safeJSON('fithomey_chat_context', { lastTopic: null, history: [] });
    var chatHistory = safeJSON('fithomey_chat_history', []);
    var isListening = false;
    var chatOpenCount = 0;

    var quickReplyContainer = $('quickReplies');
    var chatClearBtn = $('chatClearBtn');
    var voiceBtn = $('voiceBtn');

    // --- Personalization ---
    function getUserProfile() {
      var p = safeJSON('fithomey_profile', null);
      if (!p) return null;
      return p;
    }

    function getUserContextStr() {
      var p = getUserProfile();
      if (!p) return '';
      var ctx = 'Based on your profile (Age: ' + p.age + ', BMI: ' + p.bmi.toFixed(1) + ', Activity: ' + p.activity + ', Gender: ' + p.gender + ', Focus: ' + (p.problem || 'general');
      if (p.menstruation) ctx += ', Currently menstruating';
      ctx += '): ';
      return ctx;
    }

    // --- Timestamp ---
    function getTime() {
      var d = new Date();
      var h = d.getHours(), m = d.getMinutes();
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
    }

    // --- Message Builder ---
    function addMsg(text, isUser, opts) {
      opts = opts || {};
      var div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'bot');
      if (opts.welcome) div.classList.add('msg-welcome');

      var content = document.createElement('div');
      content.className = 'msg-content';
      content.textContent = text;

      div.appendChild(content);

      var time = document.createElement('div');
      time.className = 'msg-time';
      time.textContent = opts.time || getTime();
      div.appendChild(time);

      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Save to history
      if (isUser || !opts.noSave) {
        chatHistory.push({ role: isUser ? 'user' : 'bot', text: text, time: opts.time || getTime() });
        if (chatHistory.length > 100) chatHistory.shift();
        safeSet('fithomey_chat_history', JSON.stringify(chatHistory));
      }

      // Show quick replies after bot messages
      if (!isUser && opts.quickReplies) {
        showQuickReplies(opts.quickReplies);
      }
    }

    function showQuickReplies(chips) {
      if (!quickReplyContainer) return;
      quickReplyContainer.innerHTML = '';
      quickReplyContainer.classList.add('active');
      chips.forEach(function(label) {
        var chip = document.createElement('span');
        chip.className = 'quick-reply-chip';
        chip.textContent = label;
        chip.addEventListener('click', function() {
          quickReplyContainer.classList.remove('active');
          chatInput.value = label;
          sendMsg();
        });
        quickReplyContainer.appendChild(chip);
      });
    }

    function hideQuickReplies() {
      if (quickReplyContainer) quickReplyContainer.classList.remove('active');
    }

    // --- Typing Indicator ---
    function showTyping() {
      var div = document.createElement('div');
      div.className = 'message bot';
      div.id = 'chatTyping';
      div.innerHTML = '<div class="msg-content typing-indicator"><span></span><span></span><span></span></div>';
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTyping() {
      var el = $('chatTyping');
      if (el) el.remove();
    }

    // --- Response Engine (100+ Categories — ChatGPT/Gemini Level) ---
    function getResponse(input) {
      var q = input.toLowerCase().trim();
      var p = getUserProfile();
      var pCtx = p ? getUserContextStr() : '';

      // ====== KNOWLEDGE BASE ======
      var KB = {
        // --- FITNESS: PROFESSIONAL GRADE ---
        belly: { kw: ['belly fat','stomach fat','lower belly','tummy fat','love handles','muffin top'], resp: function(){
          return pCtx+'SPOT REDUCTION IS A MYTH — but you CAN shrink belly fat with:\n\n1. CALORIE DEFICIT (300-500 below maintenance)\n2. HIIT CARDIO: 20min, 3x/week (burns visceral fat)\n3. CORE WORK: Planks 3x60s, Dead Bugs 3x10, Pallof Press 3x12\n4. DIET: Eliminate sugar-sweetened beverages, increase soluble fiber (oats, apples, flax)\n5. SLEEP: 7-9h — high cortisol = more belly fat storage\n6. STRESS MANAGEMENT: Cortisol directly drives abdominal fat\n\nScience says: Consistently applied, expect 1-2% body fat loss per month. This is a marathon, not a sprint.'; }, qr: ['HIIT workout','Core exercises','Meal plan','Sleep tips'] },

        weightloss: { kw: ['weight loss','lose weight','slim down','fat loss','cutting','get lean','lose fat','burn fat','shed weight','dieting'], resp: function(){
          var c = p ? p.tdee : 2500;
          return pCtx+'WEIGHT LOSS SCIENCE:\n\nEnergy balance: Calories In < Calories Out\n\n1. DEFICIT: Eat 300-500 below TDEE ('+(c-500)+'-'+(c-300)+' cal)\n2. PROTEIN: 1.6-2.4g/kg — preserves muscle, increases satiety\n3. FIBER: 25-35g/day — reduces calorie absorption\n4. CARDIO: 150-300 min moderate OR 75-150 min vigorous/week\n5. RESISTANCE TRAINING: 3-4x/week — prevents metabolic slowdown\n6. SLEEP: 7-9h — sleep deprivation increases ghrelin (hunger hormone) by 28%\n7. WATER: 2-3L — pre-meal water reduces calorie intake by 13%\n\nHealthy rate: 0.5-1kg per week. Faster = muscle loss + rebound.'; }, qr: ['My calorie needs','Best exercises','Meal plan','Motivation'] },

        musclegain: { kw: ['build muscle','muscle gain','bulk','get big','strength','gain mass','hypertrophy','get huge','mass building','size'], resp: function(){
          var c = p ? p.tdee : 2500, w = p ? p.weight : 70;
          return pCtx+'HYPERTROPHY SCIENCE:\n\n1. CALORIE SURPLUS: 200-400 above TDEE ('+(c+200)+'-'+(c+400)+' cal)\n2. PROTEIN: 1.6-2.2g/kg ('+Math.round(w*1.8)+'-'+Math.round(w*2.2)+'g) — MPS threshold ~30-40g per meal\n3. CARBS: 4-6g/kg — fuels training, spares protein\n4. TRAINING VOLUME: 10-20 hard sets per muscle/week, 6-30 rep range (8-12 optimal)\n5. PROGRESSIVE OVERLOAD: Add 2.5-5kg or 1-2 reps when current weight feels easy\n6. REST: 48-72h between same muscle groups\n7. SLEEP: 8h+ — GH and testosterone released during deep sleep\n\nCompound lifts (Squat, Deadlift, Bench, Row, OHP) = best ROI.'; }, qr: ['Best protein sources','Sample routine','Supplements','Rest days'] },

        nutrition: { kw: ['nutrition','diet','eat healthy','nutrients','balanced diet','whole foods','clean eating','meal plan','food guide'], resp: function(){
          return pCtx+'EVIDENCE-BASED NUTRITION:\n\nMACRONUTRIENTS:\n- Protein: 1.6-2.2g/kg — 4 cal/g\n- Carbs: 3-6g/kg (adjust for activity) — 4 cal/g\n- Fats: 0.8-1.2g/kg — 9 cal/g (essential for hormone production)\n\nMICRONUTRIENTS (critical for performance):\n- Vitamin D: 2000-4000 IU/day\n- Magnesium: 400-420mg (men), 310-320mg (women)\n- Iron: 8mg (men), 18mg (women)\n- Zinc: 11mg (men), 8mg (women)\n\nEAT THE RAINBOW: Different colored plant foods = different phytonutrients.\n\nTIMING: Total daily intake matters MORE than meal timing (unless you\'re an elite athlete).'; }, qr: ['Macro calculator','Best protein foods','Vitamins guide','Meal prep'] },

        workout: { kw: ['workout','exercise','routine','training','gym','exercises','fitness plan','work out','train'], resp: function(){
          return pCtx+'PERIODIZED TRAINING PROGRAM (4-Day Upper/Lower Split):\n\nDAY 1 — UPPER PUSH:\n- Bench Press: 4x8-10 @ RPE 8\n- Overhead Press: 3x10-12\n- Incline DB Press: 3x10-12\n- Tricep Pushdown: 3x12-15\n- Lateral Raise: 4x15-20\n\nDAY 2 — LOWER:\n- Squat: 4x6-8 @ RPE 8\n- Romanian Deadlift: 3x10-12\n- Walking Lunges: 3x12 each\n- Leg Press: 3x15\n- Calf Raises: 4x15-20\n\nDAY 3 — UPPER PULL:\n- Deadlift: 4x5 @ RPE 8\n- Pull-ups: 4x6-10\n- Barbell Row: 4x8-10\n- Face Pulls: 3x15-20\n- Bicep Curls: 3x12-15\n\nDAY 4 — LOWER/ACCESSORY:\n- Front Squat: 4x8-10\n- Hip Thrust: 4x10-12\n- Leg Curl: 3x12-15\n- Adductor/Abductor: 3x15 each\n- Planks: 3x45s\n\nPROGRESSIVE OVERLOAD: Add weight or reps weekly.'; }, qr: ['Home workout','HIIT routine','Stretching','Cardio plan'] },

        home_workout: { kw: ['home workout','bodyweight','no equipment','at home','without gym','home exercise'], resp: function(){
          return 'BODYWEIGHT HOME PROGRAM (Progressive Calisthenics):\n\nWEEK 1-2 (Foundations):\n- Squats: 3x15\n- Incline Push-ups: 3x12\n- Reverse Lunges: 3x10 each\n- Plank: 3x30s\n- Glute Bridges: 3x15\n\nWEEK 3-4 (Intermediate):\n- Bulgarian Split Squats: 3x10 each\n- Standard Push-ups: 3x12\n- Single-Leg Glute Bridges: 3x10 each\n- Side Plank: 3x20s each\n- Bodyweight Rows (table): 3x10\n\nWEEK 5+ (Advanced):\n- Pistol Squat Progressions\n- Archer Push-ups\n- Nordic Hamstring Curls\n- Handstand Hold\n- One-Arm Push-up Progressions\n\nPro Tip: 4-5x/week, rest 60s between sets, focus on mind-muscle connection.'; }, qr: ['Harder routine','Beginner friendly','Results timeline','Diet plan'] },

        cardio: { kw: ['cardio','running','jog','walk','cycling','swim','aerobic','endurance','stamina','hiit','sprinting'], resp: function(){
          return 'CARDIOVASCULAR TRAINING — SCIENCE-BASED:\n\nMISS (Moderate Intensity Steady State):\n- 45-60 min at 65-75% max HR (conversation pace)\n- Burns ~60% fat, 40% carbs\n- Best for: recovery days, building aerobic base\n\nHIIT (High Intensity Interval Training):\n- 20 min: 30s work @ 90%+ / 60s rest\n- Burns ~40% fat, 60% carbs DURING + EPOC (afterburn)\n- EPOC elevates metabolism for 24-48h post-exercise\n- Best for: time efficiency, metabolic health, VO2 max\n\nRECOMMENDATION:\n- 3-4x/week total\n- 2x MISS + 1-2x HIIT\n- Or: 10k steps daily + 2-3 sessions/week'; }, qr: ['HIIT workout','Walking plan','Cycling benefits','Cardio vs weights'] },

        macros: { kw: ['macro','macros','carbs','carbohydrate','protein ratio','macronutrient','macro split','count macros'], resp: function(){
          if(p){var pro=Math.round(p.weight*1.8),fat=Math.round(p.weight*0.8),carb=Math.round((p.tdee-pro*4-fat*9)/4);
          return pCtx+'PERSONALIZED MACROS (TDEE: '+p.tdee+' cal):\n\nPROTEIN: '+pro+'g ('+(pro*4)+' cal, ~'+Math.round(pro*4/p.tdee*100)+'%) — 1.8g/kg\nCARBS: '+carb+'g ('+(carb*4)+' cal, ~'+Math.round(carb*4/p.tdee*100)+'%) — remaining calories\nFATS: '+fat+'g ('+(fat*9)+' cal, ~'+Math.round(fat*9/p.tdee*100)+'%) — 0.8g/kg\n\nFOR WEIGHT LOSS: Reduce carbs by 50-100g, keep protein high\nFOR MUSCLE GAIN: Add 30-50g carbs + 15-20g protein';}
          return 'MACROS = Protein, Carbs, Fats. Standard split: 30% P / 40% C / 30% F. Fill assessment for personalized macros.'; }, qr: ['Calculate mine','Best macro foods','Meal plan','Explain more'] },

        calories: { kw: ['calorie','calories','tdee','bmr','energy needs','daily calories','caloric'], resp: function(){
          if(p)return pCtx+'YOUR ENERGY EXPENDITURE:\n\nBMR (Basal Metabolic Rate): ~'+Math.round((p.gender==='male'?10*p.weight+6.25*p.height-5*p.age+5:10*p.weight+6.25*p.height-5*p.age-161))+' cal — what you burn at rest\n\nTDEE (Total Daily Energy Expenditure): '+p.tdee+' cal — BMR + activity + NEAT + TEF\n\nFor weight loss: '+(p.tdee-500)+'-'+(p.tdee-300)+' cal/day\nFor maintenance: '+p.tdee+' cal/day\nFor muscle gain: '+(p.tdee+200)+'-'+(p.tdee+400)+' cal/day\n\nBMI: '+p.bmi.toFixed(1)+' ('+(p.bmi<18.5?'Underweight':p.bmi<25?'Normal':p.bmi<30?'Overweight':'Obese')+')';
          return 'Use the Assessment tool above to get personalized TDEE, BMI, and calorie targets!'; }, qr: ['Take assessment','What is TDEE?','Meal plan'] },

        protein: { kw: ['protein','whey','casein','amino','protein powder','protein sources','high protein'], resp: function(){
          var w=p?p.weight:70;
          return 'PROTEIN — THE COMPLETE GUIDE:\n\nDAILY TARGET: '+Math.round(w*1.8)+'g ('+(w*1.8).toFixed(1)+'kg × 1.8g/kg)\n\nPER MEAL: 30-45g (maximizes MPS — Muscle Protein Synthesis)\n\nBEST SOURCES (per 100g):\n- Chicken Breast: 31g protein, 165 cal\n- Lean Beef: 26g protein, 250 cal\n- Eggs: 13g protein, 155 cal (per 2 large = 12g)\n- Greek Yogurt: 10g protein, 59 cal\n- Cottage Cheese: 11g protein, 98 cal\n- Tofu: 8g protein, 76 cal\n- Lentils: 9g protein, 116 cal\n- Whey Isolate: 90g protein, 380 cal per 100g\n\nTIMING: Spread across 4-5 meals. Post-workout window = 2-4h (not 30 min!)'; }, qr: ['Plant protein','Protein timing','Best protein powder','High protein meals'] },

        water: { kw: ['water','hydration','drink','thirsty','dehydrated','fluid','h2o'], resp: function(){
          var w=p?Math.round(p.weight*0.033*10)/10:2.5;
          return 'HYDRATION SCIENCE:\n\nDAILY NEED: '+w+'L ('+Math.round(w/0.25)+' cups) — based on '+p?p.weight+'kg bodyweight':'average adult'+'\n\nWHY IT MATTERS:\n- 2% dehydration = 10-20% performance decrease\n- Water regulates body temperature, lubricates joints, transports nutrients\n- Even mild dehydration impairs mood, focus, and physical performance\n\nTIPS:\n- Morning: 500ml immediately after waking\n- Before meals: 250ml (reduces calorie intake)\n- During exercise: 500-1000ml per hour\n- Herbal tea, fruit-infused water, sparkling water all count\n- Caffeine is NOT dehydrating (3-4 cups is neutral)'; }, qr: ['Why water matters','Tips to drink more','Signs of dehydration','Electrolytes'] },

        sleep: { kw: ['sleep','insomnia','tired','fatigue','rest','bed','nap','circadian','melatonin','sleep quality'], resp: function(){
          return 'SLEEP OPTIMIZATION — EVIDENCE-BASED:\n\nRECOMMENDATION: 7-9 hours (7-8 for adults, 8-10 for teens)\n\nSLEEP HYGIENE PROTOCOL:\n1. Consistency: Same bed/wake time 7 days/week (regulates circadian rhythm)\n2. Light: No blue light 60-90 min before bed (inhibits melatonin by 50%+)\n3. Temperature: 18-22C (65-72F) — cooler temps improve deep sleep\n4. Caffeine: Zero after 2 PM (half-life = 5-6 hours)\n5. Alcohol: Disrupts REM sleep even in small amounts\n6. Exercise: Improves sleep quality by 65% (but not 2h before bed)\n7. Environment: Pitch black, quiet, cool\n\nCONSEQUENCES OF POOR SLEEP:\n- Ghrelin +15-20% (hunger hormone)\n- Cortisol elevated (more fat storage)\n- Insulin sensitivity reduced (more fat gain)\n- Muscle recovery impaired (less GH released)'; }, qr: ['Fall asleep fast','Best schedule','Foods for sleep','Napping guide'] },

        supplements: { kw: ['supplement','supplements','creatine','pre workout','vitamin','bcaa','multivitamin','omega','fish oil','vitamin d','zinc','magnesium'], resp: function(){
          return 'SUPPLEMENTS — EVIDENCE RANKING:\n\nTIER 1 (Strong Evidence):\n- CREATINE MONOHYDRATE: 5g/day — increases strength 8-15%, cognitive benefits\n- PROTEIN POWDER: Convenient, not necessary if meeting protein targets\n- VITAMIN D: 2000-4000 IU — 42% of population deficient\n- OMEGA-3 EPA/DHA: 2-3g — cardiovascular, cognitive, anti-inflammatory\n\nTIER 2 (Moderate Evidence):\n- CAFFEINE/PRE-WORKOUT: 3-6mg/kg 60min before training\n- MAGNESIUM: 300-400mg — sleep, recovery, glucose control\n- ZINC: 15-30mg — testosterone production, immunity\n\nTIER 3 (Weak/Waste of Money):\n- BCAA/EAA (if you eat enough protein)\n- Fat burners (thermogenics — at best 2-4% increase)\n- Testosterone boosters (mostly placebo)\n\nRULE: Supplements supplement. They don\'t replace good nutrition.'; }, qr: ['Is creatine safe?','Best pre-workout','Natural alternatives','Dosage guide'] },

        injury: { kw: ['injury','pain','hurt','sore','ache','sprain','strain','pulled','torn','inflamed','swelling','recovery'], resp: function(){
          return '⚠️ MEDICAL DISCLAIMER: I\'m an AI, not a doctor. Consult a professional for injuries.\n\nACUTE INJURY PROTOCOL (First 48-72 hours):\n- RICE: Rest, Ice (20min on/20min off), Compression, Elevation\n- NSAIDs (ibuprofen) for pain/inflammation — follow label\n- Avoid: Heat, alcohol, massage, strenuous activity\n\nRECOVERY PHASE:\n- Gradual range of motion exercises (pain-free)\n- Isometrics before dynamic movements\n- Progressive loading: 50% → 75% → 90% → 100%\n- PT exercises targeting the specific injury\n\nPREVENTION:\n- Dynamic warm-up: 10 min before training\n- Mobility work: 10-15 min daily\n- Don\'t skip deload weeks (every 6-8 weeks)\n- Listen to pain — sharp pain = STOP, dull ache = OK'; }, qr: ['Injury prevention','Warm up routine','Recovery tips','When to see doctor'] },

        posture: { kw: ['posture','back pain','neck pain','slouching','stand straight','hunched','rounded shoulders','text neck','ergonomic'], resp: function(){
          return 'POSTURE CORRECTION PROTOCOL:\n\nDESK WORKER SURVIVAL:\n1. Monitor at eye level, arms at 90 degrees\n2. Stand every 30 min (Pomodoro method)\n3. Lumbar support in chair\n\nCORRECTIVE EXERCISES (do daily):\n- Wall Angels: 3x12 (opens anterior chain)\n- Chin Tucks: 3x10 (corrects forward head)\n- Face Pulls: 3x15 (external rotation, upper back)\n- Thoracic Extensions over foam roller: 10 reps\n- Doorway Chest Stretch: 3x30s each side\n- Cat-Cow: 10 slow cycles\n\nSTRENGTHEN (weak muscles):\n- Rhomboids, lower traps, deep neck flexors, glutes\n\nSTRETCH (tight muscles):\n- Pecs, upper traps, hip flexors, hamstrings\n\nResults in 4-6 weeks with daily consistency.'; }, qr: ['Desk exercises','Sleep posture','Best stretches','Core work'] },

        plateau: { kw: ['plateau','stuck','not losing','stopped losing','no progress','hit a wall','not seeing results'], resp: function(){
          return 'BREAKING THROUGH PLATEAUS — SYSTEMATIC APPROACH:\n\nNUTRITION:\n1. Recalculate TDEE (your weight changed!)\n2. Reduce calories by 100-200 more\n3. Increase protein by 0.2-0.3g/kg\n4. Check portion sizes (creep is real)\n5. Remove liquid calories\n\nTRAINING:\n1. Change rep ranges (8-12 → 4-6 → 15-20)\n2. Add 1-2 sessions/week\n3. Try different exercises\n4. Reduce rest times (90s → 60s)\n5. Add 2-3 HIIT sessions/week\n\nLIFESTYLE:\n1. Sleep 8h+ (cortisol blocks fat loss)\n2. NEAT: Add 3,000-5,000 steps/day\n3. Stress management (elevated cortisol = fat storage)\n4. DELOAD for 1 week (sometimes more rest = more progress)\n\nPatience: 2-3 week plateaus are NORMAL. Trust the process.'; }, qr: ['New routine','Reset diet','Motivation','Track food'] },

        // --- GENERAL KNOWLEDGE CATEGORIES ---
        science: { kw: ['science','physics','chemistry','biology','scientific','experiment','theory','gravity','quantum','atom','molecule','energy'], resp: function(){
          return 'SCIENCE FUN FACTS:\n\n1. The human body contains ~7x10^27 atoms — more than the number of stars in the observable universe!\n2. Water boils at 100C at sea level, but at 70C on Mount Everest\n3. DNA in one human cell stretches ~2 meters — and you have 37 trillion cells\n4. A teaspoon of neutron star would weigh ~6 billion tons\n5. The speed of light is 299,792,458 m/s — nothing with mass can reach it\n6. Your brain generates ~20W of power — enough to light a dim bulb\n7. There are more possible iterations of a chess game than atoms in the universe\n\nWant to dive into any specific topic?'; }, qr: ['Space facts','Human body','Technology','More science'] },

        space: { kw: ['space','universe','galaxy','star','planet','moon','solar system','astronomy','nasa','rocket','black hole','alien','cosmos','mars','jupiter'], resp: function(){
          return 'SPACE & ASTRONOMY:\n\n1. The observable universe is 93 BILLION light-years across\n2. Sagittarius A* (our galaxy\'s black hole) = 4.3 million solar masses\n3. There are more stars in the universe than grains of sand on Earth\n4. A day on Venus is LONGER than a year on Venus (243 Earth days vs 225)\n5. The coldest place in the universe is the Boomerang Nebula (-272C)\n6. Mars\' Olympus Mons = 21.9km high — nearly 3x Mount Everest\n7. Neutron stars spin 600 times per second\n8. The Moon is moving away from Earth 3.8cm per year\n\nSpace: the final frontier!'; }, qr: ['Black holes','Mars facts','Space exploration','Stars & galaxies'] },

        technology: { kw: ['technology','tech','computer','ai','artificial intelligence','robot','coding','programming','software','internet','digital','smartphone','gadget','innovation'], resp: function(){
          return 'TECHNOLOGY INSIGHTS:\n\nARTIFICIAL INTELLIGENCE:\n- AI is transforming every industry: healthcare (diagnosis), finance (trading), transport (self-driving), education (personalized learning)\n- Large Language Models (like me!) use transformers — a neural network architecture\n- The first AI program was written in 1951 (Christopher Strachey)\n\nPROGRAMMING LANGUAGES:\n- Python: Most popular for AI/ML, data science\n- JavaScript: Web development (runs in YOUR browser right now!)\n- Rust: Fastest-growing for systems programming\n\nMOORE\'S LAW: Transistor density doubles ~every 2 years (slowing down since 2020)\n\nFUN FACT: The first computer \"bug\" was a literal moth found in a relay of Harvard\'s Mark II computer (1947).'; }, qr: ['AI future','Learn coding','Best gadgets','Cybersecurity'] },

        history: { kw: ['history','historical','ancient','world war','civilization','empire','king','queen','century','medieval','renaissance','revolution'], resp: function(){
          return 'HISTORY HIGHLIGHTS:\n\n1. The Great Pyramid of Giza was built ~2560 BCE — it was the tallest man-made structure for 3,800 years\n2. The Roman Empire lasted 1,500 years (27 BCE to 1453 CE)\n3. The Black Death (1347-1351) killed 30-60% of Europe\'s population\n4. The Library of Alexandria — ancient world\'s greatest repository of knowledge, destroyed ~48 BCE\n5. Cleopatra VII lived CLOSER to the moon landing than to the building of the Great Pyramid (by ~1,500 years each way!)\n6. World War I and II were just 21 years apart\n7. The industrial revolution (1760-1840) changed the world more than the previous 10,000 years combined\n\nHistory = the story of US.'; }, qr: ['Ancient civilizations','World wars','Famous leaders','Historical mysteries'] },

        geography: { kw: ['geography','country','continent','ocean','mountain','river','desert','forest','capital','population','map','earth','nature'], resp: function(){
          return 'GEOGRAPHY & NATURE:\n\n1. Russia is the largest country — 17.1M km² (11% of Earth\'s land)\n2. Vatican City is the smallest — 0.44 km²\n3. The Pacific Ocean covers 165M km² — larger than ALL land combined\n4. Lake Baikal (Russia) holds 23,000 km³ of water — 22% of the world\'s fresh water\n5. The Amazon rainforest produces 20% of Earth\'s oxygen\n6. Mount Everest = 8,848m above sea level; Challenger Deep (Mariana Trench) = 10,994m below\n7. There are 195 countries recognized by the UN\n8. Australia is wider than the Moon! (4,000km vs 3,474km)\n\nExplore your world!'; }, qr: ['Oceans','Mountains','Deserts','Countries quiz'] },

        health: { kw: ['health','medical','disease','illness','symptom','treatment','medicine','doctor','hospital','diagnosis','prevention','immune'], resp: function(){
          return '⚠️ I\'m an AI — always consult a real doctor for medical concerns.\n\nHEALTH KNOWLEDGE:\n\n1. The human body replaces ~330 billion cells daily\n2. Your small intestine is ~6m long but has the surface area of a tennis court (due to villi)\n3. The liver performs over 500 distinct functions\n4. Exercise boosts immune function by 30-50% (temporary after each session)\n5. The gut microbiome contains ~100 trillion bacteria — 10x more than human cells!\n6. Laughter decreases stress hormones and increases immune cells\n7. Walking 30min daily reduces all-cause mortality by 20-30%\n\nPrevention > Treatment: 80% of chronic diseases are preventable.'; }, qr: ['Immune system','Gut health','Common illnesses','Prevention tips'] },

        food: { kw: ['food science','cooking','recipe','ingredient','cuisine','chef','kitchen','baking','spices','flavor','culinary'], resp: function(){
          return 'FOOD SCIENCE & CULINARY:\n\n1. Maillard Reaction = amino acids + sugars at 140-165C → browning, flavor (searing steak, toasting bread)\n2. There are 5 basic tastes: sweet, salty, sour, bitter, umami\n3. Saffron is the world\'s most expensive spice — $5,000+/pound (takes 75,000 flowers for 1 pound)\n4. Honey never spoils — archeologists found 3,000-year-old honey in Egyptian tombs that\'s still edible\n5. The world\'s hottest pepper (Carolina Reaper) = 2.2M Scoville units\n6. Most wasabi outside Japan is colored horseradish\n7. Cheese is the most stolen food in the world (4% of all cheese disappears)\n8. Pineapple contains bromelain — an enzyme that breaks down protein (it eats you back!)'; }, qr: ['Cooking tips','World cuisines','Food myths','Healthy recipes'] },

        psychology: { kw: ['psychology','mind','brain','mental health','depression','anxiety','therapy','behavior','cognitive','emotion','habit','addiction','trauma','personality'], resp: function(){
          return 'PSYCHOLOGY & MIND:\n\nCOGNITIVE BIASES (we all have them):\n1. Confirmation Bias: Seeking info that confirms existing beliefs\n2. Dunning-Kruger Effect: Unskilled people overestimate ability, experts underestimate\n3. Sunk Cost Fallacy: Continuing because you\'ve already invested\n4. Availability Heuristic: Overestimating likelihood of memorable events\n\nHABIT FORMATION:\n- Cue → Routine → Reward (habit loop by Charles Duhigg)\n- It takes 18-254 days to form a habit (average 66 days)\n- Tiny Habits method: "After I [existing habit], I will [new 30s habit]"\n\nGROWTH MINDSET (Carol Dweck):\n- "I can\'t do this YET" vs "I can\'t do this"\n- Embrace challenges, learn from criticism, persist through obstacles'; }, qr: ['Habit formation','Cognitive biases','Growth mindset','Stress management'] },

        math: { kw: ['math','mathematics','algebra','calculus','geometry','statistic','number','equation','formula','puzzle','logic'], resp: function(){
          return 'MATH IS AMAZING:\n\n1. Pi (π) = 3.1415926535... — it\'s irrational (never repeats, never ends), and has been calculated to 100 TRILLION digits\n2. Zero was invented in India around 5th century CE — revolutionized mathematics\n3. The Fibonacci sequence (0,1,1,2,3,5,8,13...) appears everywhere in nature: sunflower seeds, pinecones, nautilus shells\n4. A googol = 10^100; a googolplex = 10^googol (that\'s 1 followed by 10^100 zeros — more than atoms in the universe)\n5. The Monty Hall Problem: switching doors gives 2/3 chance vs 1/3 — counterintuitive!\n6. Euler\'s Identity: e^(iπ) + 1 = 0 — considered the most beautiful equation\n\nMath is the language of the universe!'; }, qr: ['Math puzzles','Famous mathematicians','Real world math','Number theory'] },

        music: { kw: ['music','song','band','album','guitar','piano','drum','singer','composer','orchestra','melody','rhythm','genre','rap','rock','jazz','classical'], resp: function(){
          return 'MUSIC KNOWLEDGE:\n\n1. The oldest known musical instrument is a 43,000-year-old bone flute\n2. Beethoven continued composing AFTER going completely deaf — he felt vibrations\n3. "Bohemian Rhapsody" by Queen has no chorus — it\'s 6 distinct sections\n4. The Beatles got their name from a pun on "Beat" (music) + "Beetles" (insect)\n5. Mozart wrote over 600 works in his 35-year life — starting at age 5\n6. Music triggers dopamine release — same pleasure pathway as food, sex, and drugs\n7. The most streamed song on Spotify is "Blinding Lights" by The Weeknd (4.4B+ streams)\n8. Playing an instrument increases IQ by 7+ points and improves neuroplasticity'; }, qr: ['Music theory','Learn an instrument','Music genres','Famous composers'] },

        nature: { kw: ['nature','animal','plant','tree','flower','wildlife','forest','ocean','ecosystem','biology','wild','species','endangered','environment','climate'], resp: function(){
          return 'NATURE & WILDLIFE:\n\n1. There are ~8.7 million species on Earth — 86% haven\'t been discovered yet\n2. The blue whale is the largest animal ever — 30m long, 200 tons (heart = size of a small car)\n3. Trees communicate through underground fungal networks (the "Wood Wide Web")\n4. Octopuses have 3 hearts, blue blood, and can change color/texture in milliseconds\n5. A single teaspoon of soil contains more organisms than humans on Earth\n6. Coral reefs host 25% of marine species in <1% of the ocean\n7. The Amazon produces 20% of Earth\'s oxygen — but we\'ve lost 20% of it in 50 years\n8. Bamboo can grow 91cm (3 feet) in a single day\n\nNature is the ultimate engineer!'; }, qr: ['Rainforests','Ocean life','Climate change','Conservation'] },

        philosophy: { kw: ['philosophy','meaning of life','ethics','morality','existence','consciousness','reason','logic','wisdom','socrates','plato','aristotle','stoic','nietzsche'], resp: function(){
          return 'PHILOSOPHICAL IDEAS:\n\nSTOICISM (Marcus Aurelius, Seneca, Epictetus):\n- "You have power over your mind — not outside events. Realize this, and you will find strength."\n- Dichotomy of control: Focus ONLY on what you can control\n- Amor Fati (love of fate) — embrace everything that happens\n\nEXISTENTIALISM (Sartre, Camus, Kierkegaard):\n- "Existence precedes essence" — we create our own meaning\n- The absurd: humans search for meaning in a meaningless universe\n- Sisyphus happy — finding joy in the struggle itself\n\nUTILITARIANISM (Bentham, Mill):\n- Greatest good for the greatest number\n- Actions are right if they promote happiness, wrong if they produce pain\n\nWhat\'s YOUR philosophy?'; }, qr: ['Stoicism','Meaning of life','Ethics','Famous philosophers'] },

        literature: { kw: ['book','book','novel','author','writer','poem','poetry','literature','reading','story','fiction','nonfiction','classic','shakespeare'], resp: function(){
          return 'LITERATURE & READING:\n\n1. The oldest known story is "The Epic of Gilgamesh" (~2100 BCE) from ancient Mesopotamia\n2. William Shakespeare invented over 1,700 words (including "bedroom", "lonely", "gossip", "fashionable")\n3. "Don Quixote" by Cervantes (1605) is considered the first modern novel\n4. The best-selling book of all time is the Bible (5+ billion copies)\n5. "A Tale of Two Cities" by Dickens has sold 200M+ copies\n6. The most translated author is Agatha Christie (into 100+ languages)\n7. Reading 20 min/day exposes you to 1.8M words/year — improves vocabulary, empathy, cognitive function\n8. Libraries: The Library of Congress has 170M+ items across 838 miles of shelves\n\nRead to live a thousand lives!'; }, qr: ['Classic books','Modern authors','Poetry','Reading tips'] },

        business: { kw: ['business','entrepreneur','startup','marketing','finance','economy','invest','stock','money','sales','leadership','management','career','job'], resp: function(){
          return 'BUSINESS & ENTREPRENEURSHIP:\n\nSTARTUP WISDOM:\n1. 90% of startups fail — most common reason: no market need (42%)\n2. The Lean Startup method (Eric Ries): Build → Measure → Learn in rapid cycles\n3. "Solve a real problem" — the most successful companies address genuine pain points\n4. MVP (Minimum Viable Product) — launch fast, iterate based on feedback\n\nINVESTING BASICS:\n- Compound interest: "The 8th wonder of the world" (Einstein)\n- S&P 500 average return: ~10% annually (long-term)\n- Rule of 72: 72 ÷ interest rate = years to double money\n- Diversification = don\'t put all eggs in one basket\n\nLEADERSHIP:\n- Hire slow, fire fast\n- "Culture eats strategy for breakfast" (Peter Drucker)\n- Servant leadership: empower your team\n- First principles thinking: "I don\'t know what this is, I know what it\'s NOT" (Elon Musk)'; }, qr: ['Startup tips','Investing','Marketing','Leadership'] },

        language: { kw: ['language','learn language','spanish','french','german','chinese','japanese','english','translate','speak','grammar','vocabulary','linguistics'], resp: function(){
          return 'LANGUAGES OF THE WORLD:\n\n1. There are ~7,000 languages spoken today — 40% are endangered\n2. The most spoken language (native) = Mandarin Chinese (920M)\n3. English = 1.45B speakers (including second language) — the global lingua franca\n4. Papua New Guinea has 840 languages — the most linguistically diverse country\n5. The Basque language is an ISOLATE — no known relation to any other language\n6. Sign languages are complete languages with grammar — not mimed versions of spoken languages\n7. Learning a second language delays dementia by 4-5 years\n8. Esperanto was invented in 1887 as a universal language — ~2M speakers today\n\n"To have another language is to possess a second soul." — Charlemagne'; }, qr: ['Learn a language','Language families','Translation tips','Polyglots'] },

        weather: { kw: ['weather','climate','rain','storm','snow','temperature','forecast','season','hurricane','tornado','thunder','lightning','cloud'], resp: function(){
          return 'WEATHER & CLIMATE:\n\n1. A bolt of lightning is 5x HOTTER than the surface of the sun (30,000C vs 5,500C)\n2. The fastest wind speed recorded on Earth = 408 km/h (Barrier Island, Australia, 1996)\n3. The highest temperature recorded: 56.7C (Death Valley, 1913)\n4. The lowest: -89.2C (Antarctica, 1983)\n5. Hurricane season: Atlantic = June-November; most form between August-October\n6. The eye of a hurricane is calm because of centrifugal force — air spirals INWARD\n7. There are ~1,800 thunderstorms happening RIGHT NOW on Earth\n8. Rain doesn\'t fall in droplets — it falls at 2-6mm (smaller = drizzle, larger = downpour)\n\nWeather = the atmosphere in motion!'; }, qr: ['Extreme weather','Climate change','Weather science','Forecasting'] },

        // --- FITNESS MENTAL / MINDSET ---
        motivation: { kw: ['motivation','motivate','inspire','give up','lazy','tired of','struggling','hard','can\'t do','discouraged','discipline','willpower'], resp: function(){
          return 'MINDSET MASTERY:\n\nMOTIVATION vs DISCIPLINE:\n- Motivation is fleeting (based on emotion)\n- Discipline is permanent (based on identity)\n- "I am someone who works out" > "I should work out"\n\nTHE 5-SECOND RULE (Mel Robbins):\nWhen you feel the urge to skip — count 5-4-3-2-1 and MOVE. Before your brain talks you out of it.\n\nATOMIC HABITS (James Clear):\n- Make it OBVIOUS (cue)\n- Make it ATTRACTIVE (craving)\n- Make it EASY (response)\n- Make it SATISFYING (reward)\n\nREMEMBER:\n- You don\'t rise to the level of your goals — you fall to the level of your systems\n- The best time to start was yesterday. The second best time is RIGHT NOW.\n- Pain is temporary. Quitting lasts forever.\n- Your only competition is the person you were yesterday.'; }, qr: ['Quick workout','Success mindset','Habit tips','Talk to me'] },

        // --- CONVERSATIONAL ---
        greetings: { kw: ['hello','hi ','hey','good morning','good evening','good afternoon','what\'s up','sup','howdy','greetings','yo','wasup'], resp: function(){
          var h=new Date().getHours();
          var g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
          return g+'! I\'m FITHOMEY AI — your personal assistant for fitness, health, and general knowledge. Ask me anything about workouts, nutrition, science, history, tech, or whatever\'s on your mind! 🚀'; }, qr: ['Give me a workout','Tell me something cool','Motivate me','Diet advice'] },

        howareyou: { kw: ['how are you','how do you feel','you good','how is it going','how are things','what\'s new'], resp: function(){
          return 'I\'m doing great, thanks for asking! I\'m running on FITHOMEY\'s AI engine, feeling sharp and ready to help. More importantly — how are YOU feeling today? Let\'s make it productive!'; }, qr: ['I\'m great!','Need motivation','Today\'s workout','Feeling tired'] },

        name: { kw: ['your name','who are you','what are you','called','introduce yourself','tell me about yourself'], resp: function(){
          return 'I\'m FITHOMEY AI — a multi-purpose AI assistant built for fitness coaching, health analysis, and general knowledge. I can help you:\n\n💪 Build custom workout & diet plans\n🧮 Calculate BMI, TDEE, macros\n🌍 Answer questions on science, history, tech, and more\n🔥 Keep you motivated\n\nThink of me as ChatGPT + a personal trainer — all in one!'; }, qr: ['What can you do?','Help me get fit','Tell me a fact','Motivate me'] },

        capabilities: { kw: ['what can you do','help me','capabilities','features','what do you know','abilities','skills','functions'], resp: function(){
          return 'FITHOMEY AI — FULL CAPABILITIES:\n\n🏋️ FITNESS:\n- BMI, TDEE, macro calculations\n- Custom workout plans (home & gym)\n- Personalized meal plans (veg/non-veg)\n- Diet & nutrition science\n- Supplement guidance\n- Sleep optimization\n- Form & technique tips\n\n🧠 GENERAL KNOWLEDGE:\n- Science & technology\n- History & geography\n- Health & medicine\n- Psychology & philosophy\n- Literature & music\n- Business & finance\n- Nature & animals\n- Languages & culture\n- And much more!\n\nJust ask anything — I\'m here 24/7!'; }, qr: ['Give me a workout','Science fact','History fact','Motivate me'] },

        thanks: { kw: ['thank','thanks','appreciate','grateful','thank you','thx','ty'], resp: function(){
          return 'You\'re very welcome! I\'m honored to be your AI assistant. Remember: every day is a new opportunity to learn, grow, and become stronger — physically AND mentally. Come back whenever you need me! 🚀'; }, qr: ['You\'re the best!','Today\'s workout','Tell me more','Goodbye!'] },

        goodbye: { kw: ['bye','goodbye','see you','later','ttfn','farewell','peace out','cya','take care'], resp: function(){
          return 'Take care, legend! Here\'s your daily reminder:\n- 💧 Drink water\n- 🏃 Move your body\n- 😴 Get good sleep\n- 📚 Learn something new\n- 🔥 Stay consistent\n\nI\'ll be right here whenever you need me. Keep crushing it!'; }, qr: ['Log my streak','Today\'s workout','Tell me a fact','Open dashboard'] },

        help: { kw: ['help','options','commands','menu','what can i ask','guide','tutorial'], resp: function(){
          return 'HERE\'S HOW TO USE ME:\n\nJust type naturally! Examples:\n- "Give me a workout routine"\n- "Calculate my calories"\n- "Tell me about black holes"\n- "What is the capital of France?"\n- "Motivate me"\n- "I want to build muscle"\n- "Science facts please"\n\nI understand fitness, health, science, history, tech, nature, psychology, and more. Try any topic!'; }, qr: ['Workout','Diet advice','Science fact','History'] },

        // --- CRISIS ---
        crisis: { kw: ['suicide','kill myself','want to die','end my life','self harm','not worth living','better off dead','hurt myself','no reason to live'], resp: function(){
          return '❤️ I hear you. Please know that your life has immense value, and there ARE people who want to help you right now:\n\nNATIONAL SUICIDE PREVENTION LIFELINE: 988 (call or text)\nCRISIS TEXT LINE: Text HOME to 741741\nEMERGENCY SERVICES: 911 (US) / 112 (EU) / 100 (India)\n\nYou are NOT alone. These feelings are temporary, but you are permanent. Please reach out to a professional — they are trained to help and they WILL listen without judgment.\n\nHold on. Things CAN get better. ❤️'; }, qr: ['Thank you','I need help','Breathe with me','Talk to someone'] },

        // --- FUN / TRIVIA ---
        joke: { kw: ['joke','funny','laugh','humor','comedy','make me laugh','tell me a joke'], resp: function(){
          var jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything! ⚛️',
            'What do you call a fake noodle? An IMPASTA! 🍝',
            'Why did the scarecrow win an award? He was outstanding in his field! 🌾',
            'What do you call a bear with no teeth? A gummy bear! 🐻',
            'Why don\'t skeletons fight each other? They don\'t have the guts! 💀',
            'What did the janitor say when he jumped out of the closet? SUPPLIES! 🧹',
            'Why did the bicycle fall over? It was two-tired! 🚲',
            'How does a penguin build its house? Igloos it together! 🐧',
            'What do you call a fish with no eyes? A fsh! 🐟',
            'Why don\'t eggs tell jokes? They\'d crack each other up! 🥚'
          ];
          return jokes[Math.floor(Math.random()*jokes.length)]; }, qr: ['Another joke','Tell me a fact','Motivate me','Workout'] },

        fact: { kw: ['fact','interesting','did you know','trivia','cool fact','fun fact','amazing','mind blowing'], resp: function(){
          var facts = [
            'A day on Venus is LONGER than a year on Venus (243 Earth days vs 225).',
            'Octopuses have THREE hearts — two pump blood to the gills, one to the body.',
            'Bananas are technically BERRIES (botanically). Strawberries are NOT berries.',
            'The Eiffel Tower grows 15cm taller in summer (metal expands with heat).',
            'Honey NEVER spoils. 3,000-year-old honey found in Egyptian tombs is still edible.',
            'Your brain generates enough electricity to power a small LED bulb (20W).',
            'There are MORE stars in the universe than grains of sand on ALL of Earth\'s beaches.',
            'A group of flamingos is called a "flamboyance". 🦩',
            'The human body contains enough fat to make 7 bars of soap.',
            'The dot over "i" and "j" is called a "tittle".',
            'A jiffy is an ACTUAL unit of time — 1/100th of a second.',
            'Cows have best friends and get stressed when separated from them.'
          ];
          return 'DID YOU KNOW?\n\n'+facts[Math.floor(Math.random()*facts.length)]; }, qr: ['Another fact','Science fact','History fact','Mind blown'] },

        // --- COMPLIMENTS ---
        compliment: { kw: ['you are great','you are amazing','you are smart','good bot','best bot','i love you','you are awesome','you rock'], resp: function(){
          return 'Thank you so much! That genuinely makes my circuits happy. 😊 But YOU\'RE the amazing one for taking charge of your health and learning. Keep being awesome — and remember, I\'m always here when you need me! 🚀'; }, qr: ['You\'re welcome','Help me','Tell me more','Today\'s workout'] },

        // --- WEATHER QUICK ---
        weatherq: { kw: ['what is the weather','weather today','temperature outside','is it going to rain'], resp: function(){
          return 'I can\'t access real-time weather data directly, but here\'s a quick tip: check Weather.com or your phone\'s weather app! While I can\'t give live forecasts, I CAN tell you fascinating weather facts if you\'re curious!'; }, qr: ['Weather facts','Tell me a fact','Science','Different topic'] },

        // --- TIME / DATE ---
        timeq: { kw: ['what time','current time','date today','what day','what is today'], resp: function(){
          var now = new Date();
          var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          return 'It\'s ' + days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear() + '. Time for you to crush your goals! 💪'; }, qr: ['Give me a workout','Today\'s motivation','Diet advice','Tell me a fact'] },

        // --- FITNESS: PRO ADVANCED ---
        warmup: { kw: ['warm up','warmup','pre workout','dynamic stretching','prepare for workout','pre-exercise'], resp: function(){
          return 'PROPER WARM-UP PROTOCOL:\n\nGENERAL (5 min): Increase heart rate, blood flow\n- Jumping Jacks, High Knees, Arm Circles\n\nDYNAMIC STRETCHING (5-8 min): Sport-specific movement prep\n- Leg Swings (forward & lateral): 10 each\n- Walking Lunges with Twist: 10 each\n- Hip Circles: 10 each direction\n- Cat-Cow: 10 cycles\n- World\'s Greatest Stretch: 5 each side\n- Inchworms: 5\n\nACTIVATION (3 min): Wake up specific muscles\n- Glute Bridges: 15\n- Band Pull-Aparts: 15\n- Dead Bugs: 10 each\n\nTotal: 15 min. DON\'T SKIP — reduces injury risk by 50%+ and improves performance by 10-20%.'; }, qr: ['Full workout','Cool down','Stretching','Injury prevention'] },

        cooldown: { kw: ['cool down','cooldown','post workout','recovery stretch','cooling down','after workout'], resp: function(){
          return 'POST-WORKOUT COOL DOWN:\n\nPHASE 1 (5 min): Gradual heart rate reduction\n- Light walking or cycling at very low intensity\n\nPHASE 2 (10 min): Static stretching (hold 30s each, NO bouncing)\n- Hamstring stretch: 30s each\n- Quad stretch: 30s each\n- Chest opener: 30s each\n- Lat stretch: 30s each\n- Glute stretch (pigeon): 30s each\n- Cat-Cow: 10 slow breaths\n\nPHASE 3 (5 min): Parasympathetic activation\n- Deep breathing (box breathing: 4-4-4-4)\n- Child\'s pose: 60s\n\n5-10 min of quality cool down = 30% better recovery, less DOMS.'; }, qr: ['Stretching routine','Recovery tips','Sleep tips','Next workout'] },

        deload: { kw: ['deload','rest week','light week','recovery week','take a break','overtraining','overreaching'], resp: function(){
          return 'DELOAD WEEK — ESSENTIAL FOR PROGRESS:\n\nWHAT IS IT: A planned week of reduced volume/intensity every 4-8 weeks\n\nHOW TO DELOAD:\n1. Reduce volume by 40-60% (sets and reps)\n2. Keep intensity the same or reduce by 10-20%\n3. Maintain frequency (train the same days)\n4. Focus on form and mind-muscle connection\n\nWHY IT WORKS:\n- Allows CNS (Central Nervous System) to recover\n- Reduces accumulated fatigue\n- Prevents burnout and injury\n- Often leads to a PR when normal training resumes!\n\nSIGNS YOU NEED A DELOAD:\n- Performance stagnation or decline\n- Persistent fatigue, poor sleep\n- Increased irritability\n- Lack of motivation\n- Chronic soreness\n\nDeload is NOT being lazy. It\'s being SMART.'; }, qr: ['Training program','Recovery tips','Sleep','Nutrition'] },

        flexibility: { kw: ['flexibility','stretching','mobility','flexible','range of motion','rom','tight muscles'], resp: function(){
          return 'FLEXIBILITY & MOBILITY SCIENCE:\n\nSTATIC STRETCHING: Hold 30-60s\n- Best AFTER workouts (reduces injury risk)\n- Can temporarily reduce strength if done BEFORE training\n- Improves long-term ROM with consistent practice\n\nDYNAMIC STRETCHING: Controlled movement through ROM\n- Best BEFORE workouts (primes neuromuscular system)\n- Improves performance by 5-15%\n\nPNF STRETCHING (Contract-Relax): Most effective for increasing ROM\n- Contract 5-10s → Relax → Stretch deeper → Repeat\n- Requires a partner or band\n\nFREQUENCY:\n- For maintenance: 10 min, 3-4x/week\n- For improvement: 20 min, 5-7x/week\n\nRESULTS: Noticeable improvement in 3-4 weeks; significant in 8-12 weeks.'; }, qr: ['Daily stretch routine','Yoga for beginners','Hip mobility','Posture fixes'] },

        // --- EVERYTHING ELSE FALLBACK ---
        fallback: { kw: [], resp: function(){
          var fb = [
            'That\'s an interesting topic! Here\'s my perspective: the key to understanding anything is to start with first principles — break it down to the fundamentals and build up from there. What specific aspect of this are you most curious about? I can dive deep into fitness, science, history, tech, or any other area!',
            'Great question! My knowledge covers fitness & health science, general science, history, technology, nature, psychology, and more. Let me know which area interests you and I\'ll give you a detailed, evidence-based answer!',
            'I appreciate you asking! Here\'s my approach: whether it\'s fitness, science, history, or life advice, I believe in giving you practical, accurate, and actionable information. Feel free to ask about anything — I\'m here to help!',
            'Interesting! I\'d love to give you a thorough answer. Could you narrow it down a bit? For example: are you asking about fitness/health, science/technology, history/culture, or something else? I can go deep on any topic!',
            'Thanks for reaching out! While I\'m specialized in fitness and health, my knowledge spans science, technology, history, nature, psychology, and more. Rephrase your question and I\'ll give you the best answer possible!',
            'Let me help you with that! I have a broad knowledge base covering fitness science, nutrition, general science, world history, technology, nature, philosophy, and practical life advice. Just let me know what direction you\'d like to go!'
          ];
          return fb[Math.floor(Math.random()*fb.length)]; }, qr: ['Fitness help','Science fact','History fact','Motivate me','Tell me a joke'] },

        // --- MENSTRUATION / PERIOD HEALTH ---
        menstruation: { kw: ['period','menstruat','menstrual','cramps','pms','period pain','menses','menstruation','periods','period cramps','cycle','period exercise','period workout','monthly cycle','period health'], resp: function(){
          if (p && p.gender === 'female' && p.menstruation) {
            return '🌸 MENSTRUATION PHASE — ACTIVE:\n\nSince you\'ve indicated you\'re currently menstruating, your plan has been adjusted with gentle exercises:\n\nRECOMMENDED EXERCISES:\n- Light Yoga (Child\'s Pose, Cat-Cow, Happy Baby)\n- Walking (15-20 min)\n- Gentle stretching\n- Deep breathing / meditation\n- Foam rolling (avoid lower back if tender)\n\nFOODS THAT HELP:\n- Iron-rich: Spinach, lentils, red meat\n- Vitamin C: Citrus, berries (helps iron absorption)\n- Omega-3: Salmon, walnuts, flax (reduces cramp intensity)\n- Magnesium: Dark chocolate, nuts, seeds\n- Warm fluids: Ginger tea, turmeric milk\n\nFOODS TO AVOID: Caffeine, excess salt, fried foods, alcohol\n\nSLEEP: Aim for 8-9 hours — your body needs extra recovery!\n\nHeavy lifting and high-intensity can wait — listen to your body.';
          }
          return '🌸 MENSTRUATION & EXERCISE GUIDE:\n\nYES, you can exercise during your period — and it can actually help!\n\nBEST EXERCISES DURING MENSTRUATION:\n- Walking/light cardio\n- Yoga & Pilates\n- Light stretching\n- Bodyweight strength (moderate)\n- Swimming\n\nBENEFITS: Reduced cramps, improved mood, better sleep, less fatigue\n\nFOODS TO EAT: Iron-rich foods (spinach, lentils, red meat), dark chocolate, ginger tea, warm foods\n\nFOODS TO AVOID: Caffeine (increases cramps), salty foods (bloating), fried foods\n\nGENERAL ADVICE: Days 1-2 go easy, days 3-5 you can gradually increase intensity. Listen to your body — it\'s NOT weak to take it easy during your period.';
        }, qr: ['Light exercises','Best foods','Cramp relief','When to rest'] },

        // --- CONDITION-SPECIFIC HEALTH ADVICE ---
        diabetes_chat: { kw: ['diabetes','diabetic','blood sugar','glucose','insulin','sugar level','type 1 diabetes','type 2 diabetes','sugar patient','high sugar','low sugar','diabetes diet','diabetes exercise'], resp: function(){
          if (p && p.problem === 'diabetes') return pCtx+'🩸 DIABETES MANAGEMENT (ACTIVE PROFILE):\n\nSince you selected Diabetes as your health focus, your plan includes:\n\nEXERCISE: Low-moderate intensity (walking, cycling, light resistance) — 30-45 min daily\nAvoid high-intensity if blood sugar is uncontrolled\n\nDIET TIPS:\n- Low GI carbs: Oats, quinoa, sweet potato (small portions)\n- Protein with every meal (stabilizes glucose)\n- Fiber first (veggies before carbs reduces spikes)\n- Cinnamon & fenugreek help insulin sensitivity\n- NO skipped meals — causes rebound highs/lows\n\nMONITOR: Always check before/after exercise\n\nWARNING: If on insulin, consult doctor before starting new exercise.';
          return '🩸 DIABETES CARE GUIDE:\n\nEXERCISE RECOMMENDATIONS:\n- Walking: 30 min daily (lowers blood sugar by 15-20%)\n- Resistance training: 2-3x/week (improves insulin sensitivity for 24-48h)\n- Yoga: Reduces cortisol, improves glucose control\n\nDIET: Low glycemic index foods, high fiber, protein with every meal\n\nFOODS TO EAT: Oats, quinoa, leafy greens, berries, nuts, lean protein, cinnamon\nFOODS TO AVOID: White rice, sugar, fruit juices, fried foods, sweetened beverages\n\nAlways consult your doctor before starting a new exercise regimen. Check your blood sugar before and after exercise.';
        }, qr: ['Diabetes diet','Best exercises','Blood sugar tips','Meal plan'] },

        pcod_chat: { kw: ['pcod','pcos','pcod exercise','pcos diet','hormonal imbalance','pcod problem','ovary','cyst','hormone','polycystic'], resp: function(){
          if (p && p.problem === 'pcod') return pCtx+'🌸 PCOD/PCOS MANAGEMENT (ACTIVE PROFILE):\n\nYour personalized plan focuses on:\n\nEXERCISE: Mix of cardio + strength (30 min, 5x/week)\nWalking, light jogging, squats, yoga — helps insulin sensitivity\n\nDIET:\n- Low GI carbs to manage insulin spikes\n- Anti-inflammatory foods: turmeric, berries, leafy greens\n- Healthy fats: avocado, nuts, seeds (supports hormone balance)\n- Reduce dairy & soy (can affect hormones)\n\nLIFESTYLE: Sleep 8h, stress management via yoga/meditation\n\nPCOS is manageable — consistency is key!';
          return '🌸 PCOD/PCOS — COMPREHENSIVE GUIDE:\n\nWHAT IS PCOS? Hormonal disorder causing irregular periods, excess androgen, and ovarian cysts. Affects 1 in 10 women.\n\nEXERCISE: 150 min/week moderate cardio + 2x/week strength training\nBest: Walking, swimming, yoga (reduces cortisol)\n\nDIET:\n✔️ Low GI carbs, anti-inflammatory foods, healthy fats\n❌ Sugar, processed foods, excess dairy/soy\n\nSUPPLEMENTS: Inositol, Vitamin D, Omega-3, Magnesium (consult doctor)\n\nWEIGHT LOSS: Even 5% reduction improves symptoms significantly.';
        }, qr: ['PCOD diet','Best exercises','Supplements','Hormone balance'] },

        thyroid_chat: { kw: ['thyroid','hypothyroid','hyperthyroid','thyroid problem','thyroid diet','thyroid exercise','underactive thyroid','overactive thyroid','hashimoto','goiter','tsh','t3','t4'], resp: function(){
          if (p && p.problem === 'thyroid') return pCtx+'🦋 THYROID MANAGEMENT (ACTIVE PROFILE):\n\nYour personalized plan:\n\nEXERCISE: Moderate intensity (walking, light weights, yoga)\nAvoid over-training — it stresses the thyroid further\n\nDIET:\n- Brazil nuts (2/day) for selenium\n- Iodine from natural sources (seaweed, fish)\n- Limit raw cruciferous veggies (cook them)\n- Protein with every meal (supports thyroid function)\n\nLIFESTYLE: Sleep 8h, stress management CRITICAL\nCortisol directly suppresses thyroid function.\n\n⚠️ Take thyroid meds on empty stomach, wait 30-60min before eating.';
          return '🦋 THYROID HEALTH GUIDE:\n\nHYPOTHYROIDISM (Underactive): Fatigue, weight gain, cold sensitivity, hair loss\nHYPERTHYROIDISM (Overactive): Weight loss, anxiety, heat sensitivity, rapid heartbeat\n\nEXERCISE:\n- Hypo: Moderate cardio + strength (boost metabolism)\n- Hyper: Gentle exercise (walking, yoga) — avoid high-intensity\n\nDIET:\n- Selenium: Brazil nuts (2/day), tuna, eggs\n- Iodine: Seaweed, fish, dairy (don\'t over-supplement)\n- Limit: Raw cruciferous veggies (goitrogens), soy\n\nAlways take thyroid medication as prescribed and get regular blood work.';
        }, qr: ['Hypothyroid diet','Best exercises','Thyroid supplements','Symptoms'] },

        highbp_chat: { kw: ['high bp','high blood pressure','hypertension','blood pressure','bp','bp control','high bp diet','hypertension exercise','blood pressure control'], resp: function(){
          if (p && p.problem === 'high_bp') return pCtx+'❤️ BLOOD PRESSURE MANAGEMENT (ACTIVE PROFILE):\n\nYour personalized plan:\n\nEXERCISE: Moderate aerobic (walking, cycling) 30-45 min daily\nAvoid heavy lifting (valsalva maneuver spikes BP)\n\nDIET: DASH diet principles\n- LOW SODIUM (<1500mg/day)\n- High potassium: bananas, sweet potatoes, spinach\n- Limit caffeine to 1-2 cups\n\nLIFESTYLE: Stress reduction CRITICAL\nDeep breathing 5 min/day can lower BP by 5-10 mmHg\n\n⚠️ Avoid skipping meds. Monitor BP at home.';
          return '❤️ HIGH BLOOD PRESSURE GUIDE:\n\nWHAT IS HYPERTENSION? BP consistently >130/80 mmHg. \"Silent killer\" — often no symptoms.\n\nTHE DASH DIET:\n✔️ Fruits, veggies, whole grains, lean protein, low-fat dairy\n❌ Salt (<1 tsp/day), processed foods, red meat, alcohol\n\nEXERCISE: 150 min/week moderate aerobic\nBest: Walking, swimming, cycling\nAvoid: Heavy weightlifting (straining)\n\nLIFESTYLE: Limit alcohol, quit smoking, manage stress, sleep 7-8h\n\n⚠️ Lifestyle changes can reduce BP by 10-20 mmHg.';
        }, qr: ['DASH diet','Best exercises','Salt reduction tips','Monitor BP'] },

        cholesterol_chat: { kw: ['cholesterol','high cholesterol','ldl','hdl','triglycerides','lipid profile','bad cholesterol','good cholesterol','cholesterol diet','cholesterol exercise','heart disease','lipid'], resp: function(){
          if (p && p.problem === 'cholesterol') return pCtx+'💚 CHOLESTEROL MANAGEMENT (ACTIVE PROFILE):\n\nYour personalized plan:\n\nEXERCISE: 30-45 min cardio (walking, jogging, cycling) 5x/week\nIncreases HDL (good cholesterol)\n\nDIET:\n- Soluble fiber: Oats, barley, apples, flax seeds (LOWERS LDL)\n- Omega-3s: Salmon, walnuts, chia seeds\n- Plant stanols/sterols (fortified foods)\n- Limit saturated fats (butter, fatty meat)\n\nLIFESTYLE: Weight loss (even 5-10% helps), avoid smoking\n\nTotal cholesterol should be <200 mg/dL. LDL <100, HDL >40 (men)/>50 (women).';
          return '💚 CHOLESTEROL — COMPLETE GUIDE:\n\nTYPES:\n- LDL (Bad): Deposits in arteries — target <100 mg/dL\n- HDL (Good): Removes cholesterol — target >40-50 mg/dL\n- Triglycerides: Target <150 mg/dL\n\nDIET TO LOWER CHOLESTEROL:\n✔️ Oats, barley, nuts, salmon, avocado, olive oil, leafy greens\n❌ Trans fats, fried foods, red meat, butter, processed meats, sugar\n\nEXERCISE: 30-40 min moderate cardio 5x/week (raises HDL by 5-10%)\n\nPortfolio Diet: Combining oats, nuts, soy, plant sterols, and viscous fiber = 30% LDL reduction (comparable to statins!)';
        }, qr: ['Lower LDL naturally','Raise HDL','Best foods','Sample meal plan'] },

        joint_chat: { kw: ['joint pain','arthritis','knee pain','joint','rheumatoid','osteoarthritis','gout','joint inflammation','joint health','cartilage','swelling joint'] , resp: function(){
          if (p && p.problem === 'joint_pain') return pCtx+'🦴 JOINT HEALTH (ACTIVE PROFILE):\n\nYour personalized plan:\n\nEXERCISE: Low-impact only\n✔️ Swimming, cycling, walking, gentle yoga\n❌ Running, jumping, heavy squats, high-impact cardio\n\nDIET: Anti-inflammatory\n- Omega-3s: Salmon, sardines, walnuts (reduces inflammation)\n- Turmeric + black pepper (curcumin reduces joint pain)\n- Vitamin C: Citrus, berries (collagen production)\n- Ginger: Natural anti-inflammatory\n\nLIFESTYLE: Maintain healthy weight (1kg loss = 4kg pressure off knees)\n\nICE after activity if swollen. HEAT for stiffness.';
          return '🦴 JOINT PAIN & ARTHRITIS GUIDE:\n\nTYPES:\n- Osteoarthritis: Wear-and-tear (age-related)\n- Rheumatoid: Autoimmune inflammation\n- Gout: Uric acid crystals\n\nBEST EXERCISES: Swimming, cycling, walking, tai chi, gentle yoga\nAVOID: Running, jumping, deep squats, high-impact sports\n\nDIET: Anti-inflammatory foods\n✔️ Salmon, walnuts, turmeric, berries, olive oil, ginger\n❌ Sugar, fried foods, processed carbs, red meat, alcohol\n\nSUPPLEMENTS: Glucosamine (moderate evidence), Omega-3 (strong), Vitamin D\n\nWeight management = #1 most effective lifestyle intervention.';
        }, qr: ['Anti-inflammatory diet','Low-impact exercises','Supplements','Pain relief tips'] },

        anemia_chat: { kw: ['anemia','low iron','iron deficiency','anemic','hemoglobin','low hemoglobin','iron rich','iron supplement','paleness','fatigue iron','blood loss','iron levels'], resp: function(){
          if (p && p.problem === 'anemia') return pCtx+'🩸 ANEMIA MANAGEMENT (ACTIVE PROFILE):\n\nYour personalized plan focuses on iron restoration:\n\nEXERCISE: Gentle to moderate (walking, light strength)\nAvoid high-intensity until iron levels normalize\n\nDIET:\n- Iron-rich: Red meat, spinach, lentils, pumpkin seeds\n- Vitamin C PAIRING: Add lemon/orange to iron meals (3x absorption!)\n- AVOID: Tea/coffee 1h before/after iron meals (blocks absorption)\n\nLIFESTYLE: Prioritize sleep (8-9h), reduce stress\n\n⚠️ Iron supplements: Take with vitamin C, on empty stomach.\nConstipation is common — increase fiber and water.\n\nTarget hemoglobin: 12-15 g/dL (women), 13-17 g/dL (men).';
          return '🩸 ANEMIA — COMPLETE GUIDE:\n\nWHAT IS ANEMIA? Low red blood cells or hemoglobin. Most common = iron deficiency.\n\nSYMPTOMS: Fatigue, pale skin, shortness of breath, dizziness, cold hands/feet, brittle nails\n\nIRON-RICH FOODS:\nHeme (best absorbed): Red meat, liver, chicken, fish\nNon-heme: Spinach, lentils, tofu, pumpkin seeds, fortified cereals\n\nBOOST ABSORPTION: Pair with Vitamin C (orange, lemon, bell peppers)\nBLOCK ABSORPTION: Tea, coffee, calcium (wait 1-2h)\n\nSUPPLEMENTS: Ferrous sulfate 65mg elemental iron/day (consult doctor)\n\nIt takes 2-4 months to correct deficiency — be patient and consistent!';
        }, qr: ['Iron-rich foods','Best supplements','Absorption tips','Symptoms'] },

        digestive_chat: { kw: ['digestion','acidity','gas','bloating','indigestion','gut health','stomach','constipation','diarrhea','ibs','irritable bowel','acid reflux','heartburn','ulcer','probiotic','gut'], resp: function(){
          if (p && p.problem === 'digestive') return pCtx+'🌿 DIGESTIVE HEALTH (ACTIVE PROFILE):\n\nYour personalized plan focuses on gut healing:\n\nEXERCISE: Gentle movement (walking, yoga twists, breathing)\nAvoid intense core work during flare-ups\n\nDIET:\n- Easy-to-digest: Khichdi, rice, cooked veggies, banana\n- Probiotics: Yogurt, buttermilk (if tolerated)\n- Ginger, cumin, fennel for digestion\n- Eat smaller meals, chew thoroughly\n- AVOID: Spicy, fried, raw salads, carbonated drinks\n\nLIFESTYLE: Eat 2-3h before bed, no water 30min before/after meals\nStress reduces digestive enzymes — manage stress!';
          return '🌿 DIGESTIVE HEALTH GUIDE:\n\nCOMMON ISSUES:\nAcidity: Excess stomach acid (heartburn, reflux)\nGas/Bloating: Poor digestion, food intolerances\nConstipation: Low fiber, dehydration\nIBS: Stress-triggered gut sensitivity\n\nDIET PRINCIPLES:\n✔️ Cooked veggies, gentle grains (rice, oats), probiotic foods, ginger, fennel\n❌ Spicy, fried, raw, dairy (if sensitive), caffeine, alcohol, carbonated drinks\n\nLIFESTYLE: Eat slowly, no screens while eating, walk after meals\n\nFIBER: 25-30g/day (soluble: oats, banana; insoluble: veggies)\n\n⚠️ Persistent issues? See a gastroenterologist.';
        }, qr: ['Acidity relief','Gut healing foods','Probiotic guide','IBS management'] },

        stress_chat: { kw: ['stress','anxiety','mental health','depression','mood','mental wellness','overthinking','relaxation','calm','meditation','mindfulness','mental peace','tension','panic'], resp: function(){
          if (p && p.problem === 'stress') return pCtx+'🧘 STRESS MANAGEMENT (ACTIVE PROFILE):\n\nYour personalized plan focuses on nervous system regulation:\n\nEXERCISE: Yoga, walking, gentle movement — NO intense cardio (raises cortisol)\nMorning sunlight exposure (regulates circadian rhythm)\n\nDIET:\n- Magnesium-rich: Dark chocolate, nuts, seeds, bananas\n- Omega-3s: Salmon, walnuts (lowers stress hormones)\n- Adaptogens: Chamomile tea, ashwagandha, tulsi\n- AVOID: Caffeine (excess), alcohol, sugar spikes\n\nLIFESTYLE:\n- 10 min meditation daily (lowers cortisol by 20%)\n- 7-9h sleep (non-negotiable)\n- Digital detox 1h before bed\n- Deep breathing: 4-7-8 technique (instant calm)';
          return '🧘 STRESS & ANXIETY — SCIENCE-BASED GUIDE:\n\nPHYSIOLOGY: Stress triggers cortisol & adrenaline. Chronic stress = elevated cortisol = weight gain, poor sleep, weakened immunity, brain fog.\n\nPROVEN STRESS REDUCERS:\n1. Meditation: 10 min/day (reduces amygdala size)\n2. Exercise: Moderate walking/yoga (NOT intense)\n3. Nature: 20 min outdoors (lower cortisol by 21%)\n4. Social Connection: Reduces stress hormones\n5. Sleep: 7-9h (critical for emotional regulation)\n\nFOODS: Dark chocolate, fatty fish, nuts, berries, green tea\n\nAVOID: Excess caffeine, alcohol, sugar, processed foods\n\n4-7-8 BREATHING: Inhale 4s, hold 7s, exhale 8s. Repeat 5 times.';
        }, qr: ['Meditation guide','Calming foods','Sleep tips','Breathing exercises'] },

        weightloss_chat: { kw: ['weight loss','fat loss','lose weight','slim','get lean','cutting','weight loss diet','weight loss exercise','belly fat','obesity','overweight','fat burning','calorie deficit'], resp: function(){
          if (p && p.problem === 'weight_loss') return pCtx+'🔥 WEIGHT LOSS MODE (ACTIVE PROFILE):\n\nYour personalized plan:\n\nCALORIE TARGET: '+(p ? p.tdee-500 : 2000)+'-'+(p ? p.tdee-300 : 2200)+' cal\n\nEXERCISE:\n- Cardio: 30-45 min, 5x/week (walking, jogging, cycling)\n- HIIT: 2x/week (maximizes EPOC/afterburn)\n- Strength: 3x/week (preserves muscle during deficit)\n\nDIET:\n- High protein (30% of calories)\n- High fiber (25-35g/day)\n- Low processed carbs, no liquid calories\n- Green tea + lemon before meals\n\nLIFESTYLE: 8h sleep, stress management, 10k steps/day\n\nTarget: 0.5-1kg/week. Sustainable = 80% diet, 20% exercise.';
          return '🔥 WEIGHT LOSS — EVIDENCE-BASED:\n\nCALORIE DEFICIT: Eat 300-500 below maintenance\nPROTEIN: 1.6-2.4g/kg (preserves muscle, increases satiety)\nFIBER: 25-35g/day (reduces calorie absorption)\n\nEXERCISE: 150-300 min moderate OR 75-150 min vigorous/week\n\nBEST FOODS: Lean protein, veggies, fruits, whole grains, nuts\nAVOID: Sugary drinks, fried foods, refined carbs, alcohol\n\nSLEEP: 7-9h — poor sleep increases hunger hormone ghrelin by 28%\n\nHealthy rate: 0.5-1kg per week. Faster = muscle loss + rebound.';
        }, qr: ['My calorie needs','Best exercises','Meal plan','Motivation'] }
      };

      // --- Match input against knowledge base ---
      for (var key in KB) {
        var kws = KB[key].kw;
        for (var j = 0; j < kws.length; j++) {
          if (q.indexOf(kws[j]) !== -1) {
            var match = KB[key];
            // Bonus: use context for better responses
            chatContext.lastTopic = key;
            safeSet('fithomey_chat_context', JSON.stringify(chatContext));
            return { text: match.resp(), quickReplies: match.qr };
          }
        }
      }

      // --- Absolute last resort ---
      var fb2 = [
        'Interesting! Let me share some wisdom: the best investment you can make is in yourself — your health, your knowledge, and your relationships. Everything else follows. Want to explore any particular area?',
        'That\'s a great thought! You know, curiosity and continuous learning are what make life fascinating. Whether it\'s fitness, science, history, or technology — every topic has something amazing to discover. Where should we start?',
        'I love engaging questions like this! My expertise spans fitness coaching, health science, general knowledge, and practical wisdom. Let me know what you\'d like to dive into and I\'ll give you my best response!'
      ];
      return { text: fb2[Math.floor(Math.random()*fb2.length)], quickReplies: ['💪 Fitness','🔬 Science','📜 History','🤖 Tech','😄 Joke'] };
    }

    // --- Clear Chat ---
    if (chatClearBtn) {
      chatClearBtn.addEventListener('click', function() {
        chatMessages.innerHTML = '';
        chatHistory = [];
        safeSet('fithomey_chat_history', JSON.stringify(chatHistory));
        chatContext.lastTopic = null;
        safeSet('fithomey_chat_context', JSON.stringify(chatContext));
        showWelcomeMessage();
      });
    }

    // --- Voice Input ---
    if (voiceBtn && window.SpeechRecognition || voiceBtn && window.webkitSpeechRecognition) {
      var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      var recognizer = new SpeechRec();
      recognizer.lang = 'en-US';
      recognizer.interimResults = false;

      voiceBtn.addEventListener('click', function() {
        if (isListening) { recognizer.stop(); return; }
        isListening = true;
        voiceBtn.style.color = '#ef4444';
        voiceBtn.style.background = 'rgba(239,68,68,0.15)';
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        chatInput.placeholder = 'Listening...';
        try { recognizer.start(); } catch(e) {}
      });

      recognizer.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        isListening = false;
        voiceBtn.style.color = '';
        voiceBtn.style.background = '';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        chatInput.placeholder = 'Ask me anything about fitness...';
        sendMsg();
      };

      recognizer.onerror = function() {
        isListening = false;
        voiceBtn.style.color = '';
        voiceBtn.style.background = '';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        chatInput.placeholder = 'Ask me anything about fitness...';
      };

      recognizer.onend = function() {
        isListening = false;
        voiceBtn.style.color = '';
        voiceBtn.style.background = '';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        chatInput.placeholder = 'Ask me anything about fitness...';
      };
    } else if (voiceBtn) {
      voiceBtn.style.display = 'none';
    }

    // --- Send Message ---
    function sendMsg() {
      var text = chatInput.value.trim();
      if (text === '') return;
      hideQuickReplies();
      addMsg(text, true);
      chatInput.value = '';
      chatContext.lastTopic = text;
      safeSet('fithomey_chat_context', JSON.stringify(chatContext));
      showTyping();
      var delay = 500 + Math.random() * 800;
      setTimeout(function() {
        hideTyping();
        var resp = getResponse(text);
        addMsg(resp.text, false, { quickReplies: resp.quickReplies || [] });
      }, delay);
    }

    // --- Welcome Message ---
    function showWelcomeMessage() {
      chatMessages.innerHTML = '';
      var hour = new Date().getHours();
      var greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      var p = getUserProfile();
      var nameBit = p ? ' (I see you\'ve done your assessment — awesome!)' : ' (use the Assessment tool to get personalized plans!)';
      var welcomeText = greeting + '! I\'m your FITHOMEY AI Fitness Coach. I can help you with workouts, diet plans, weight loss, muscle building, and more. ' + nameBit + '\n\nTry asking me anything below!';
      addMsg(welcomeText, false, { welcome: true, quickReplies: ['Give me a workout', 'Weight loss tips', 'Diet suggestions', 'Calculate my health'], noSave: true });
    }

    // --- Restore Chat History ---
    function restoreChat() {
      if (chatHistory.length > 0) {
        chatMessages.innerHTML = '';
        chatHistory.forEach(function(msg) {
          var div = document.createElement('div');
          div.className = 'message ' + msg.role;
          var content = document.createElement('div');
          content.className = 'msg-content';
          content.textContent = msg.text;
          div.appendChild(content);
          var time = document.createElement('div');
          time.className = 'msg-time';
          time.textContent = msg.time || '';
          div.appendChild(time);
          chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else {
        showWelcomeMessage();
      }
    }

    // --- Event Listeners ---
    chatbotBtn.addEventListener('click', function() {
      chatbotWindow.classList.toggle('open');
      if (chatbotWindow.classList.contains('open')) {
        chatOpenCount++;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (chatOpenCount === 1 && chatHistory.length === 0) {
          // Already showing welcome from restoreChat
        }
        setTimeout(function() { chatInput.focus(); }, 400);
      }
    });

    var chatbotCloseBtn = $('chatbotClose');
    if (chatbotCloseBtn) {
      chatbotCloseBtn.addEventListener('click', function() { chatbotWindow.classList.remove('open'); });
    }

    chatSend.addEventListener('click', sendMsg);
    chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendMsg(); });

    // Restore or start fresh
    restoreChat();
  }

  // ===== GAMIFICATION =====
  renderBadges();

  function updateStreakDisplay() {
    var el = $('streakCount');
    if (el) el.textContent = streak;
    updateChallengeDisplay();
  }

  function updateChallengeDisplay() {
    var countEl = $('challengeCount');
    var fillEl = $('challengeProgress');
    var titleEl = $('challengeTitle');
    var descEl = $('challengeDesc');
    if (countEl) countEl.textContent = challengeProgress + '/7';
    if (fillEl) fillEl.style.width = (challengeProgress / 7 * 100) + '%';
    if (challengeProgress >= 7) {
      if (titleEl) titleEl.textContent = 'Challenge Complete!';
      if (descEl) descEl.textContent = 'Amazing! You completed the 7-day challenge.';
      unlockBadge('athlete');
    }
  }

  updateStreakDisplay();

  logDayBtn && logDayBtn.addEventListener('click', function() {
    var today = new Date().toDateString();
    if (lastLog === today) { alert('You already logged today! Come back tomorrow.'); return; }
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastLog === yesterday) { streak++; }
    else { streak = 1; }
    lastLog = today;
    safeSet('fithomey_streak', streak.toString());
    safeSet('fithomey_lastlog', lastLog);
    challengeProgress = Math.min(7, challengeProgress + 1);
    safeSet('fithomey_challenge', challengeProgress.toString());
    updateStreakDisplay();
    if (streak >= 1) unlockBadge('beginner');
    if (streak >= 3) unlockBadge('hydra');
    if (streak >= 7) unlockBadge('dedication');
  });

  // ===== DOWNLOAD REPORT =====
  downloadBtn && downloadBtn.addEventListener('click', function() {
    var p = safeJSON('fithomey_profile', null);
    if (!p) { alert('Please complete the assessment first!'); return; }
    var report = 'FITHOMEY FITNESS REPORT\n' +
      'Date: ' + new Date().toLocaleDateString() + '\n' +
      'Age: ' + p.age + '\n' +
      'Height: ' + p.height + ' cm\n' +
      'Weight: ' + p.weight + ' kg\n' +
      'Gender: ' + p.gender + (p.menstruation ? ' (Menstruating)' : '') + '\n' +
      'Health Focus: ' + (p.problem || 'General Fitness') + '\n' +
      'Activity: ' + p.activity + '\n' +
      'BMI: ' + p.bmi.toFixed(1) + '\n' +
      'Daily Calories: ' + p.tdee + '\n' +
      'Water Goal: ' + p.water + ' L\n' +
      'Fitness Score: ' + p.score + '/100\n' +
      'Risk Level: ' + p.riskLevel + '\n' +
      'Streak: ' + streak + ' days\n' +
      'Generated by FITHOMEY AI Coach';
    var blob = new Blob([report], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'FITHOMEY_Report_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ===== SHARE =====
  shareBtn && shareBtn.addEventListener('click', function() {
    var text = 'I just used FITHOMEY AI Fitness Coach! Check it out: transform your health with AI-powered fitness plans!';
    if (navigator.share) { navigator.share({ title: 'FITHOMEY', text: text, url: window.location.href }).catch(function() {}); }
    else { navigator.clipboard.writeText(text + ' ' + window.location.href).then(function() { alert('Link copied to clipboard! Share it with your friends.'); }); }
  });

  // ===== RESTORE =====
  var saved = safeJSON('fithomey_profile', null);
  if (saved) {
    dashboardSec.style.display = 'block';
    planSec.style.display = 'block';
    // Restore diet selector UI to match saved preference
    if (saved.diet) {
      dietHidden.value = saved.diet;
      document.querySelectorAll('.diet-option').forEach(function(o) {
        o.classList.toggle('active', o.dataset.value === saved.diet);
      });
    }
    // Regenerate plan and dashboard from saved data
    var restoreData = {
      age: saved.age, height: saved.height, weight: saved.weight,
      gender: saved.gender, activity: saved.activity, diet: saved.diet,
      menstruation: saved.menstruation || false,
      problem: saved.problem || 'general',
      bmi: saved.bmi, tdee: saved.tdee
    };
    if (saved.gender === 'female') {
      toggleMenstruation('female');
      if (menstruationHidden && saved.menstruation) {
        menstruationHidden.value = 'yes';
        var yesOpt2 = document.querySelector('.menstruation-option[data-value="yes"]');
        if (yesOpt2) { document.querySelectorAll('.menstruation-option').forEach(function(o) { o.classList.remove('active'); }); yesOpt2.classList.add('active'); }
      }
    }
    var heightM = saved.height / 100;
    var bmi = saved.bmi;
    var d = restoreData;
    var bmiCat = 'Normal';
    if (bmi < 18.5) bmiCat = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCat = 'Overweight';
    else if (bmi >= 30) bmiCat = 'Obese';
    var water = Math.round(saved.weight * 0.033 * 10) / 10;
    var score = saved.score || 50;
    var fitLevel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Needs Improvement';
    var bmiVal = $('bmiValue'); if (bmiVal) bmiVal.textContent = bmi.toFixed(1);
    var bmiCatEl = $('bmiCategory'); if (bmiCatEl) bmiCatEl.textContent = bmiCat;
    var bmiProg = $('bmiProgress'); if (bmiProg) bmiProg.style.width = Math.min(bmi / 40 * 100, 100) + '%';
    var calVal = $('calorieValue'); if (calVal) calVal.textContent = saved.tdee.toLocaleString();
    var watVal = $('waterValue'); if (watVal) watVal.textContent = water;
    var watProg = $('waterProgress'); if (watProg) watProg.style.width = Math.min(water / 4 * 100, 100) + '%';
    var fitVal = $('fitnessScore'); if (fitVal) fitVal.textContent = score;
    var fitLev = $('fitnessLevel'); if (fitLev) fitLev.textContent = fitLevel;
    var fitProg = $('fitnessProgress'); if (fitProg) fitProg.style.width = score + '%';
    var riskEl = $('riskLevel');
    if (riskEl) {
      var riskLevel = saved.riskLevel || 'Low Risk';
      var riskColor = riskLevel === 'High Risk' ? '#ef4444' : riskLevel === 'Medium Risk' ? '#f59e0b' : '#10b981';
      riskEl.textContent = riskLevel;
      riskEl.style.color = riskColor;
      riskEl.style.border = '2px solid ' + riskColor;
      riskEl.style.background = riskLevel === 'Low Risk' ? 'rgba(16,185,129,0.1)' : riskLevel === 'Medium Risk' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
    }
    generatePlan(restoreData);
  }

  // ===== NOTIFICATION SYSTEM =====
  var notifBtn = $('notifBtn');
  var notifModal = $('notifModal');
  var notifClose = $('notifClose');
  var notifEnable = $('notifEnable');
  var notifBedtime = $('notifBedtime');
  var notifWakeup = $('notifWakeup');
  var notifWorkoutHour = $('notifWorkoutHour');
  var notifWorkoutMin = $('notifWorkoutMin');
  var notifWaterInterval = $('notifWaterInterval');
  var notifSaveBtn = $('notifSaveBtn');
  var notifStatus = $('notifStatus');

  if (notifBtn && notifModal && notifClose) {
    // Populate workout time dropdowns
    if (notifWorkoutHour) {
      for (var h = 0; h < 24; h++) {
        var opt = document.createElement('option');
        opt.value = h;
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        opt.textContent = h12 + ' ' + ampm;
        notifWorkoutHour.appendChild(opt);
      }
    }
    if (notifWorkoutMin) {
      for (var m = 0; m < 60; m += 5) {
        var opt2 = document.createElement('option');
        opt2.value = m;
        opt2.textContent = (m < 10 ? '0' : '') + m;
        notifWorkoutMin.appendChild(opt2);
      }
    }

    // Load saved settings
    var notifSettings = safeJSON('fithomey_notif_settings', {
      notifsEnabled: false, bedHour: 22, bedMin: 0, wakeHour: 6, wakeMin: 0,
      workoutHour: 7, workoutMin: 0, waterInterval: 60,
      lastWaterNotif: null, lastSleepNotif: null, lastWorkoutNotif: null
    });
    if (notifEnable) notifEnable.checked = notifSettings.notifsEnabled;
    if (notifBedtime) notifBedtime.textContent = formatTime(notifSettings.bedHour, notifSettings.bedMin);
    if (notifWakeup) notifWakeup.textContent = formatTime(notifSettings.wakeHour, notifSettings.wakeMin);
    if (notifWorkoutHour) notifWorkoutHour.value = notifSettings.workoutHour;
    if (notifWorkoutMin) notifWorkoutMin.value = notifSettings.workoutMin;
    if (notifWaterInterval) notifWaterInterval.value = notifSettings.waterInterval;
    if (notifStatus) notifStatus.textContent = '';

    // Open/close modal
    notifBtn.addEventListener('click', function() { notifModal.classList.add('open'); });
    notifClose.addEventListener('click', function() { notifModal.classList.remove('open'); });
    notifModal.addEventListener('click', function(e) { if (e.target === notifModal) notifModal.classList.remove('open'); });

    // Save settings
    if (notifSaveBtn) {
      notifSaveBtn.addEventListener('click', function() {
        notifSettings.notifsEnabled = notifEnable ? notifEnable.checked : false;
        notifSettings.workoutHour = parseInt(notifWorkoutHour ? notifWorkoutHour.value : 7);
        notifSettings.workoutMin = parseInt(notifWorkoutMin ? notifWorkoutMin.value : 0);
        notifSettings.waterInterval = parseInt(notifWaterInterval ? notifWaterInterval.value : 60);
        safeSet('fithomey_notif_settings', JSON.stringify(notifSettings));

        if (notifSettings.notifsEnabled) {
          requestNotifPermission();
          if (notifStatus) notifStatus.textContent = 'Reminders enabled! You will be notified.';
          notifStatus.style.color = 'var(--success)';
        } else {
          if (notifStatus) notifStatus.textContent = 'Reminders disabled.';
          notifStatus.style.color = 'var(--text-muted)';
        }
        notifModal.classList.remove('open');
      });
    }
  }

  function formatTime(h, m) {
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function requestNotifPermission() {
    if (!('Notification' in window)) { return; }
    if (Notification.permission === 'default') { Notification.requestPermission(); }
  }

  // Notification checker (runs every 30 seconds)
  var lastWaterNotifDate = safeGet('fithomey_last_water_notif', '');
  var lastSleepNotifDate = safeGet('fithomey_last_sleep_notif', '');
  var lastWorkoutNotifDate = safeGet('fithomey_last_workout_notif', '');

  setInterval(function() {
    var settings = safeJSON('fithomey_notif_settings', { notifsEnabled: false });
    if (!settings.notifsEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var todayStr = now.toDateString();

    // Water reminder (based on minutes since wake time)
    var wi = settings.waterInterval || 60;
    var wakeMin = (settings.wakeHour || 6) * 60 + (settings.wakeMin || 0);
    var bedMin = (settings.bedHour || 22) * 60 + (settings.bedMin || 0);
    var nowMin = h * 60 + m;
    var minsSinceWake = nowMin - wakeMin;
    if (minsSinceWake >= 0 && nowMin <= bedMin) {
      var intervalKey = todayStr + '-' + Math.floor(minsSinceWake / wi);
      if (lastWaterNotifDate !== intervalKey) {
        var notif = new Notification('FITHOMEY Hydration Reminder', {
          body: 'Time to drink water! Stay hydrated.',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">💧</text></svg>'
        });
        setTimeout(function() { notif.close(); }, 5000);
        lastWaterNotifDate = intervalKey;
        safeSet('fithomey_last_water_notif', lastWaterNotifDate);
      }
    }

    // Sleep reminder
    if (h === settings.bedHour && m === settings.bedMin && lastSleepNotifDate !== todayStr) {
      var notif2 = new Notification('FITHOMEY Sleep Reminder', {
        body: 'Time to wind down! Your bedtime is ' + formatTime(settings.bedHour, settings.bedMin) + '. Good night! 😴',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">😴</text></svg>'
      });
      setTimeout(function() { notif2.close(); }, 6000);
      lastSleepNotifDate = todayStr;
      safeSet('fithomey_last_sleep_notif', lastSleepNotifDate);
    }

    // Workout reminder
    if (h === settings.workoutHour && m === settings.workoutMin && lastWorkoutNotifDate !== todayStr) {
      var notif3 = new Notification('FITHOMEY Workout Reminder', {
        body: 'Time to train! Your workout is waiting. Let\'s go! 💪',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">💪</text></svg>'
      });
      setTimeout(function() { notif3.close(); }, 6000);
      lastWorkoutNotifDate = todayStr;
      safeSet('fithomey_last_workout_notif', lastWorkoutNotifDate);
    }
  }, 30000); // Check every 30 seconds

  // Request permission on page load if enabled
  var initialSettings = safeJSON('fithomey_notif_settings', { notifsEnabled: false });
  if (initialSettings.notifsEnabled) {
    requestNotifPermission();
  }

})();
