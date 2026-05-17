document.addEventListener('DOMContentLoaded', () => {

  // ===== NAVIGATION =====
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // scroll active link
  const sections = document.querySelectorAll('.section, .hero');
  window.addEventListener('scroll', () => {
    let current = 'home';
    sections.forEach(sec => {
      const top = sec.offsetTop - 150;
      if (scrollY >= top) current = sec.id || 'home';
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });

  // ===== ACTIVITY SELECTOR =====
  document.querySelectorAll('.activity-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.activity-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      document.getElementById('activity').value = opt.dataset.value;
    });
  });

  // ===== ANALYZE =====
  document.getElementById('analyzeBtn').addEventListener('click', analyze);

  function getInputs() {
    const age = parseInt(document.getElementById('age').value) || 25;
    let height = parseFloat(document.getElementById('height').value) || 175;
    if (document.getElementById('heightUnit').value === 'ft') height *= 30.48;
    const weight = parseFloat(document.getElementById('weight').value) || 70;
    const gender = document.getElementById('gender').value;
    const activity = document.getElementById('activity').value;
    return { age, height, weight, gender, activity };
  }

  function analyze() {
    const { age, height, weight, gender, activity } = getInputs();

    // BMI
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    let bmiCat = 'Normal';
    if (bmi < 18.5) bmiCat = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCat = 'Overweight';
    else if (bmi >= 30) bmiCat = 'Obese';

    // TDEE (Mifflin-St Jeor)
    let bmr;
    if (gender === 'male') bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    else bmr = 10 * weight + 6.25 * height - 5 * age - 161;

    const actMul = { low: 1.2, medium: 1.55, high: 1.9 };
    const tdee = Math.round(bmr * (actMul[activity] || 1.55));

    // Water (liters)
    const water = Math.round((weight * 0.033) * 10) / 10;

    // Fitness Score 0-100
    let score = 50;
    if (bmi >= 18.5 && bmi < 25) score += 20;
    else if (bmi >= 25 && bmi < 30) score += 5;
    else score -= 10;
    if (age >= 18 && age <= 40) score += 10;
    else if (age > 40 && age <= 60) score += 5;
    else if (age > 60) score -= 5;
    if (activity === 'high') score += 15;
    else if (activity === 'medium') score += 8;
    if (weight >= 50 && weight <= 90) score += 5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    let fitLevel = 'Needs Improvement';
    if (score >= 80) fitLevel = 'Excellent';
    else if (score >= 60) fitLevel = 'Good';
    else if (score >= 40) fitLevel = 'Average';

    // Update Dashboard
    document.getElementById('bmiValue').textContent = bmi.toFixed(1);
    document.getElementById('bmiCategory').textContent = bmiCat;
    const bmiPct = Math.min((bmi / 40) * 100, 100);
    document.getElementById('bmiProgress').style.width = bmiPct + '%';

    document.getElementById('calorieValue').textContent = tdee.toLocaleString();
    document.getElementById('waterValue').textContent = water;
    const waterPct = Math.min((water / 4) * 100, 100);
    document.getElementById('waterProgress').style.width = waterPct + '%';

    document.getElementById('fitnessScore').textContent = score;
    document.getElementById('fitnessLevel').textContent = fitLevel;
    document.getElementById('fitnessProgress').style.width = score + '%';

    // Health Risk
    let riskLevel = 'Low Risk';
    let riskMsg = 'You are in a healthy range. Keep up the good work!';
    let riskColor = 'var(--success)';
    let riskPct = 20;
    if (bmi >= 30 || score < 30) {
      riskLevel = 'High Risk';
      riskMsg = 'Your health indicators suggest significant risk. Consider consulting a doctor and adopting a healthier lifestyle.';
      riskColor = 'var(--danger)';
      riskPct = 85;
    } else if (bmi >= 25 || score < 50) {
      riskLevel = 'Medium Risk';
      riskMsg = 'Some health indicators need attention. Improving your diet and exercise routine is recommended.';
      riskColor = 'var(--warning)';
      riskPct = 50;
    }
    const riskEl = document.getElementById('riskLevel');
    riskEl.textContent = riskLevel;
    riskEl.style.color = riskColor;
    riskEl.style.border = '2px solid ' + riskColor;
    riskEl.style.background = riskLevel === 'Low Risk' ? 'rgba(16,185,129,0.1)' : riskLevel === 'Medium Risk' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
    document.getElementById('riskMessage').textContent = riskMsg;
    const riskFill = document.getElementById('riskProgress');
    riskFill.style.width = riskPct + '%';
    riskFill.style.background = riskColor;

    // Show dashboard & plan sections
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('plan').style.display = 'block';

    // Generate plan
    generatePlan({ age, height, weight, gender, activity, bmi, tdee });

    // Scroll to dashboard
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });

    // Unlock fitpro badge
    unlockBadge('fitpro');

    // Save to localStorage
    const profile = { age, height, weight, gender, activity, bmi, tdee, water, score, riskLevel };
    localStorage.setItem('fithomey_profile', JSON.stringify(profile));
  }

  // ===== PLAN GENERATOR =====
  function generatePlan(data) {
    const { age, gender, activity, bmi } = data;
    const isHighBMI = bmi >= 25;
    const isActive = activity === 'high';
    const isMedium = activity === 'medium';

    // Workout - Home
    const homeEx = isHighBMI
      ? ['Jumping Jacks (3x20)', 'Bodyweight Squats (3x15)', 'Push-ups (3x10)', 'Plank (3x30s)', 'Lunges (3x12 each)', 'Glute Bridges (3x15)', 'High Knees (3x30s)']
      : isActive
        ? ['Burpees (3x15)', 'Pike Push-ups (3x12)', 'Bulgarian Split Squats (3x10)', 'Diamond Push-ups (3x10)', 'Handstand Hold (3x20s)', 'Pistol Squats (3x8)', 'Mountain Climbers (3x40s)']
        : ['Push-ups (3x12)', 'Bodyweight Squats (3x15)', 'Plank (3x20s)', 'Lunges (3x10 each)', 'Glute Bridges (3x12)', 'Calf Raises (3x20)', 'Crunches (3x15)'];
    document.getElementById('homeWorkoutList').innerHTML = homeEx.map(e => '<li>' + e + '</li>').join('');

    // Workout - Gym
    const gymEx = isHighBMI
      ? ['Treadmill Walk (20 min incline)', 'Lat Pulldown (3x12)', 'Leg Press (3x15)', 'Seated Row (3x12)', 'Chest Press Machine (3x12)', 'Cable Crunch (3x15)', 'Elliptical (15 min)']
      : isActive
        ? ['Deadlift (4x8)', 'Bench Press (4x8)', 'Barbell Row (4x8)', 'Overhead Press (4x8)', 'Squat (4x8)', 'Pull-ups (3x10)', 'HIIT Cardio (20 min)']
        : ['Dumbbell Press (3x12)', 'Lat Pulldown (3x12)', 'Leg Press (3x15)', 'Dumbbell Row (3x12)', 'Plank (3x30s)', 'Cycling (20 min)'];
    document.getElementById('gymWorkoutList').innerHTML = gymEx.map(e => '<li>' + e + '</li>').join('');

    // Diet / Meal Plan
    const meals = isHighBMI ? {
      breakfast: { name: 'Breakfast', desc: 'Oatmeal with berries + green tea' },
      snack1: { name: 'Morning Snack', desc: 'Apple with almonds' },
      lunch: { name: 'Lunch', desc: 'Grilled chicken salad + quinoa' },
      snack2: { name: 'Evening Snack', desc: 'Greek yogurt + honey' },
      dinner: { name: 'Dinner', desc: 'Steamed fish + steamed veggies' }
    } : isActive ? {
      breakfast: { name: 'Breakfast', desc: 'Egg white omelette + avocado toast' },
      snack1: { name: 'Morning Snack', desc: 'Protein shake + banana' },
      lunch: { name: 'Lunch', desc: 'Chicken breast + brown rice + broccoli' },
      snack2: { name: 'Evening Snack', desc: 'Peanut butter sandwich + milk' },
      dinner: { name: 'Dinner', desc: 'Lean steak + sweet potato + asparagus' }
    } : {
      breakfast: { name: 'Breakfast', desc: 'Scrambled eggs + whole grain toast' },
      snack1: { name: 'Morning Snack', desc: 'Mixed nuts + fruit' },
      lunch: { name: 'Lunch', desc: 'Turkey sandwich + side salad' },
      snack2: { name: 'Evening Snack', desc: 'Cottage cheese + berries' },
      dinner: { name: 'Dinner', desc: 'Grilled fish + roasted vegetables' }
    };
    document.getElementById('mealPlan').innerHTML = Object.values(meals).map(m =>
      '<div class="meal-item"><div class="meal-name">' + m.name + '</div><div class="meal-desc">' + m.desc + '</div></div>'
    ).join('');

    // Foods Eat / Avoid
    const eat = isHighBMI
      ? ['Leafy Greens', 'Lean Protein', 'Berries', 'Nuts', 'Whole Grains', 'Green Tea', 'Avocado']
      : ['Eggs', 'Chicken Breast', 'Bananas', 'Oats', 'Brown Rice', 'Sweet Potato', 'Spinach'];
    const avoid = ['Processed Foods', 'Sugary Drinks', 'White Bread', 'Fast Food', 'Fried Items', 'Excess Salt', 'Alcohol'];
    document.getElementById('foodsEat').innerHTML = eat.map(f => '<span class="food-tag">' + f + '</span>').join('');
    document.getElementById('foodsAvoid').innerHTML = avoid.map(f => '<span class="food-tag">' + f + '</span>').join('');

    // Sleep
    const sleep = [
      { label: 'Bedtime', time: isActive ? '9:30 PM' : isMedium ? '10:00 PM' : '10:30 PM' },
      { label: 'Wake Up', time: isActive ? '5:30 AM' : isMedium ? '6:00 AM' : '6:30 AM' },
      { label: 'Duration', time: isActive ? '8 hours' : '8 hours' },
      { label: 'Nap (optional)', time: '20-30 min after 2 PM' }
    ];
    document.getElementById('sleepSchedule').innerHTML = sleep.map(s =>
      '<div class="sleep-item"><span>' + s.label + '</span><span class="sleep-time">' + s.time + '</span></div>'
    ).join('');

    // Habits
    const habits = isHighBMI
      ? ['Walk 10,000 steps daily', 'Drink 8-10 glasses of water', 'No sugar after 6 PM', '30 min exercise daily', 'Eat slowly and mindfully', 'Track your calories', 'Sleep by 10:30 PM']
      : isActive
        ? ['Train 5-6 days a week', 'Consume 1.6-2g protein per kg', 'Stretch 10 min post-workout', 'Meditate 10 min daily', 'Track macros', 'Take rest days seriously', 'Stay hydrated throughout day']
        : ['Exercise 4 days a week', 'Eat protein with every meal', 'Walk 8,000 steps daily', 'Drink 8 glasses of water', 'Sleep 7-8 hours', 'Limit screen time before bed', 'Meal prep on Sundays'];
    document.getElementById('habitsList').innerHTML = habits.map(h => '<li>' + h + '</li>').join('');
  }

  // ===== PLAN TABS =====
  document.querySelectorAll('.plan-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.plan-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ===== CHATBOT =====
  const chatbotBtn = document.getElementById('chatbotBtn');
  const chatbotWindow = document.getElementById('chatbotWindow');
  const chatbotClose = document.getElementById('chatbotClose');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const chatMessages = document.getElementById('chatbotMessages');

  chatbotBtn.addEventListener('click', () => chatbotWindow.classList.toggle('open'));
  chatbotClose.addEventListener('click', () => chatbotWindow.classList.remove('open'));

  function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = 'message ' + (isUser ? 'user' : 'bot');
    div.innerHTML = '<div class="msg-content">' + text + '</div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'message bot';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="msg-content typing-indicator"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function getBotResponse(input) {
    const q = input.toLowerCase();
    if (q.includes('belly fat') || q.includes('lose belly') || q.includes('belly'))
      return '🔥 To lose belly fat: 1) Do 20 min cardio daily 2) Planks & core exercises 3) Cut sugar & processed carbs 4) Eat more protein & fiber 5) Sleep 7-8 hrs. Consistency is key!';
    if (q.includes('weight loss') || q.includes('lose weight') || q.includes('slim') || q.includes('fat loss'))
      return '⚡ For weight loss: Aim for a 300-500 calorie deficit. Eat whole foods, 30 min daily exercise, drink 2-3L water, sleep well. I recommend a mix of cardio + strength training!';
    if (q.includes('muscle gain') || q.includes('build muscle') || q.includes('bulk') || q.includes('get big'))
      return '💪 To gain muscle: Eat in a 200-400 calorie surplus with 1.6-2g protein per kg bodyweight. Lift heavy (8-12 reps), progressive overload, and rest 48h between muscle groups!';
    if (q.includes('diet') || q.includes('eat') || q.includes('meal') || q.includes('food') || q.includes('nutrition'))
      return '🥗 A balanced diet: 40% carbs, 30% protein, 30% healthy fats. Eat lots of veggies, lean meats, whole grains, nuts, and fruits. Avoid processed foods and sugary drinks!';
    if (q.includes('exercise') || q.includes('workout') || q.includes('routine') || q.includes('gym'))
      return '🏋️ A great full-body routine: Squats (3x12), Push-ups (3x10), Rows (3x12), Planks (3x30s), Lunges (3x10 each). Train 4-5x/week and progressively increase weights!';
    if (q.includes('calorie') || q.includes('calories') || q.includes('tdee') || q.includes('bmr'))
      return '📊 Your daily calorie needs depend on age, gender, weight, height & activity. Use the FITHOMEY Assessment tool above to calculate your exact TDEE and BMI!';
    if (q.includes('water') || q.includes('hydration') || q.includes('drink'))
      return '💧 Stay hydrated! Aim for 2-3 liters (8-12 cups) daily. More if you exercise or live in hot climate. Tip: Start your day with a glass of water!';
    if (q.includes('protein') || q.includes('protein shake') || q.includes('whey'))
      return '🥩 Good protein sources: Eggs (6g each), Chicken (31g/100g), Greek yogurt (10g/100g), Lentils (9g/100g), Tofu (8g/100g), Whey protein (20-25g/scoop). Aim for 1.6g per kg bodyweight!';
    if (q.includes('sleep') || q.includes('insomnia') || q.includes('tired'))
      return '😴 Sleep tip: Stick to a fixed schedule, no screens 1hr before bed, keep room cool & dark, avoid caffeine after 4 PM, and try meditation. 7-9 hours is optimal!';
    if (q.includes('motivation') || q.includes('motivate') || q.includes('inspire') || q.includes('keep going') || q.includes('give up'))
      return '🔥 REMEMBER: Every rep counts. Every healthy meal matters. You are building a better version of yourself. Progress > Perfection. Stay consistent, and results will follow! 💪';
    if (q.includes('hello') || q.includes('hi ') || q.includes('hey') || q.includes('good morning') || q.includes('good evening'))
      return '👋 Hey there! I\'m your FITHOMEY AI Coach. Ready to crush your fitness goals? Ask me about workouts, diet, weight loss, muscle gain, or anything health-related!';
    if (q.includes('cardio') || q.includes('running') || q.includes('jog') || q.includes('walk'))
      return '🏃 Cardio is great for heart health and fat loss! Try: 20-30 min running 3-4x/week, HIIT sessions (20 min), brisk walking (45 min), or cycling (30 min). Mix it up!';
    if (q.includes('stretch') || q.includes('flexibility') || q.includes('yoga') || q.includes('mobility'))
      return '🧘 Flexibility matters! Daily stretches: Hamstring stretch (30s each), Cat-cow (10 reps), Child\'s pose (60s), Hip flexor stretch (30s each). Great for recovery!';
    if (q.includes('thank'))
      return '😊 You\'re welcome! I\'m here to help whenever you need fitness advice. Keep crushing your goals, and remember - FITHOMEY believes in you! 🚀';
    return '💡 Great question! Here\'s my advice: Stay consistent with your routine, eat whole foods, drink plenty of water, and get quality sleep. Every small step counts toward your fitness journey! Want to ask me something more specific?';
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, true);
    chatInput.value = '';
    showTyping();
    setTimeout(() => {
      hideTyping();
      addMessage(getBotResponse(text));
    }, 800 + Math.random() * 700);
  }

  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  // ===== GAMIFICATION =====
  // Badges
  const badges = [
    { name: 'Beginner', icon: '🌱', desc: 'Start your journey', key: 'beginner' },
    { name: 'Fit Pro', icon: '💪', desc: 'Analyze your health', key: 'fitpro' },
    { name: 'Athlete', icon: '🏆', desc: '7-day streak', key: 'athlete' },
    { name: 'Hydration Hero', icon: '💧', desc: 'Log 3 days', key: 'hydra' },
    { name: 'Dedication', icon: '🔥', desc: 'Log 7 days', key: 'dedication' },
  ];

  let userBadges = JSON.parse(localStorage.getItem('fithomey_badges')) || [];
  let streak = parseInt(localStorage.getItem('fithomey_streak')) || 0;
  let lastLog = localStorage.getItem('fithomey_lastlog') || '';
  let challengeProgress = parseInt(localStorage.getItem('fithomey_challenge')) || 0;

  function renderBadges() {
    document.getElementById('badgesContainer').innerHTML = badges.map(b => {
      const unlocked = userBadges.includes(b.key);
      return '<div class="badge-item ' + (unlocked ? 'unlocked' : 'locked') + '">' +
        '<div class="badge-icon">' + b.icon + '</div>' +
        '<span class="badge-name">' + b.name + '</span>' +
        '<span class="badge-desc">' + b.desc + '</span></div>';
    }).join('');
  }

  function unlockBadge(key) {
    if (!userBadges.includes(key)) {
      userBadges.push(key);
      localStorage.setItem('fithomey_badges', JSON.stringify(userBadges));
      renderBadges();
    }
  }

  function updateStreak() {
    document.getElementById('streakCount').textContent = streak;
    updateChallenge();
  }

  function updateChallenge() {
    document.getElementById('challengeCount').textContent = challengeProgress + '/7';
    document.getElementById('challengeProgress').style.width = (challengeProgress / 7 * 100) + '%';
    if (challengeProgress >= 7) {
      document.getElementById('challengeTitle').textContent = 'Challenge Complete!';
      document.getElementById('challengeDesc').textContent = 'Amazing! You completed the 7-day challenge.';
      unlockBadge('athlete');
    }
  }

  document.getElementById('logDayBtn').addEventListener('click', () => {
    const today = new Date().toDateString();
    if (lastLog === today) {
      alert('You already logged today! Come back tomorrow.');
      return;
    }
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastLog === yesterday) {
      streak++;
    } else if (lastLog !== today) {
      streak = 1;
    }
    lastLog = today;
    localStorage.setItem('fithomey_streak', streak.toString());
    localStorage.setItem('fithomey_lastlog', lastLog);
    updateStreak();

    challengeProgress = Math.min(7, challengeProgress + 1);
    localStorage.setItem('fithomey_challenge', challengeProgress.toString());
    updateChallenge();

    if (streak >= 1) unlockBadge('beginner');
    if (streak >= 3) unlockBadge('hydra');
    if (streak >= 7) unlockBadge('dedication');
    // fitpro badge unlocked on analyze
  });

  // Initial render
  renderBadges();
  updateStreak();
  updateChallenge();

  // ===== DOWNLOAD REPORT =====
  document.getElementById('downloadReport').addEventListener('click', () => {
    const p = JSON.parse(localStorage.getItem('fithomey_profile'));
    if (!p) { alert('Please complete the assessment first!'); return; }
    const report = [
      '═══════════════════════════════════',
      '       FITHOMEY FITNESS REPORT',
      '═══════════════════════════════════',
      '',
      'Date: ' + new Date().toLocaleDateString(),
      '',
      '--- Personal Info ---',
      'Age: ' + p.age,
      'Height: ' + p.height + ' cm',
      'Weight: ' + p.weight + ' kg',
      'Activity: ' + p.activity,
      '',
      '--- Results ---',
      'BMI: ' + p.bmi.toFixed(1),
      'Daily Calories: ' + p.tdee,
      'Water Goal: ' + p.water + ' L',
      'Fitness Score: ' + p.score + '/100',
      'Risk Level: ' + p.riskLevel,
      '',
      '--- Streak ---',
      'Current Streak: ' + streak + ' days',
      '',
      'Generated by FITHOMEY AI Coach',
      '═══════════════════════════════════'
    ].join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'FITHOMEY_Report_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ===== SHARE =====
  document.getElementById('shareBtn').addEventListener('click', () => {
    const text = '🚀 I just used FITHOMEY AI Fitness Coach! Check it out: transform your health with AI-powered fitness plans!';
    if (navigator.share) {
      navigator.share({ title: 'FITHOMEY', text: text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + ' ' + window.location.href).then(() => alert('Link copied to clipboard! Share it with your friends.'));
    }
  });

  // ===== RESTORE ON LOAD =====
  const saved = localStorage.getItem('fithomey_profile');
  if (saved) {
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('plan').style.display = 'block';
    // We could re-analyze but for simplicity just show the sections
  }

});
