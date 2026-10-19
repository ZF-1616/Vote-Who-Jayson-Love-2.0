const USERS_KEY = "voteWhoMing_users";
const CURRENT_USER_KEY = "voteWhoMing_currentUser";

window.addEventListener("load", () => {
  if (document.body.contains(document.getElementById("login-card"))) {
    initializeLoginPage();
  }
});

function loadUsers() {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
}

function setSession(username) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ username }));
}

function clearSession() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function initializeLoginPage() {
  const session = getSession();
  renderSavedUsers();

  if (session && session.username) {
    showVotePanel(session.username);
  }
}

function renderSavedUsers() {
  const users = loadUsers();
  const savedUsersEl = document.getElementById("saved-users");

  if (!savedUsersEl) return;

  const keys = Object.keys(users);
  if (!keys.length) {
    savedUsersEl.innerHTML = "<p class='small'>No saved usernames yet. Sign up to start saving accounts.</p>";
    return;
  }

  const names = keys
    .sort()
    .map((key) => `<button type="button" class="saved-user-btn" onclick="fillUsername('${users[key].username}')">${users[key].username}</button>`)
    .join("");

  savedUsersEl.innerHTML = `<p class='small'>Saved usernames:</p><div class='saved-user-list'>${names}</div>`;
}

function fillUsername(value) {
  const usernameInput = document.getElementById("login-username");
  if (usernameInput) {
    usernameInput.value = value;
  }
}

function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const message = document.getElementById("login-message");
  message.textContent = "";

  if (!username || !password) {
    message.textContent = "Please enter both username and password.";
    return;
  }

  const users = loadUsers();
  const user = users[username.toLowerCase()];

  if (!user || user.password !== password) {
    message.textContent = "Login failed. Check your credentials or sign up first.";
    return;
  }

  setSession(user.username);
  renderSavedUsers();
  showVotePanel(user.username);
}

function signup() {
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;
  const message = document.getElementById("signup-message");
  message.textContent = "";

  if (!username || !password || !confirm) {
    message.textContent = "Fill in every field to create an account.";
    return;
  }

  if (password.length < 6) {
    message.textContent = "Use at least 6 characters for your password.";
    return;
  }

  if (password !== confirm) {
    message.textContent = "Passwords do not match. Try again.";
    return;
  }

  const users = loadUsers();
  const key = username.toLowerCase();

  if (users[key]) {
    message.textContent = "That username is already taken. Choose another one.";
    return;
  }

  users[key] = { username, password, vote: null, history: [], baitCount: 0 };
  saveUsers(users);
  message.textContent = "Account created successfully. Redirecting to login...";

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1200);
}

function showVotePanel(username) {
  const loginCard = document.getElementById("login-card");
  const voteCard = document.getElementById("vote-card");
  const greeting = document.getElementById("greeting");
  const previousChoice = document.getElementById("previous-choice");
  const users = loadUsers();
  const user = users[username.toLowerCase()];

  if (loginCard) {
    loginCard.classList.add("hidden");
  }
  if (voteCard) {
    voteCard.classList.remove("hidden");
  }
  if (greeting) {
    greeting.textContent = `Welcome, ${username}`;
  }

  if (previousChoice) {
    previousChoice.textContent = user && user.vote ? user.vote : "none";
  }

  setSelectedVote(user?.vote || null);
}

function logout() {
  clearSession();
  window.location.reload();
}

function vote(choice) {
  const session = getSession();
  const feedback = document.getElementById("vote-feedback");

  if (!session || !session.username) {
    feedback.textContent = "Please log in before voting.";
    return;
  }

  const users = loadUsers();
  const userKey = session.username.toLowerCase();
  const user = users[userKey] || { username: session.username, password: "", vote: null, history: [], baitCount: 0 };
  const previousVote = user.vote || null;

  if (!Array.isArray(user.history)) {
    user.history = [];
  }
  if (user.history.length === 0 || user.history[user.history.length - 1] !== choice) {
    user.history.push(choice);
  }

  if (choice === "E. DON'T CLICK !!!") {
    user.baitCount = (user.baitCount || 0) + 1;
  }

  user.vote = choice;
  users[userKey] = user;
  saveUsers(users);

  const total = Object.values(users).filter((savedUser) => savedUser.vote).length;
  feedback.textContent = previousVote === choice
    ? `You already selected ${choice}. Total voters: ${total}.`
    : `Thanks, ${session.username}! You voted for ${choice}. Total voters: ${total}.`;
  setSelectedVote(choice);
  const previousChoice = document.getElementById("previous-choice");
  if (previousChoice) {
    previousChoice.textContent = choice;
  }
}

function setSelectedVote(choice) {
  const buttons = document.querySelectorAll(".vote[data-choice]");
  buttons.forEach((button) => {
    if (button.dataset.choice === choice) {
      button.classList.add("selected");
    } else {
      button.classList.remove("selected");
    }
  });
}

function jumpscare() {
  const jumpScare = document.getElementById("jump-scare");
  const audio = document.getElementById("jump-scare-audio");

  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {
      // user interaction needed for autoplay in some browsers
    });
  }

  if (!jumpScare) return;
  jumpScare.classList.add("visible");
  setTimeout(() => {
    jumpScare.classList.remove("visible");
  }, 2000);
}

function renderSecretPage() {
  const users = Object.values(loadUsers());
  const list = document.getElementById("secret-list");
  const count = document.getElementById("secret-count");
  const notice = document.getElementById("secret-notice");

  if (!list || !count) return;

  const rows = users
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((user) => {
      const history = Array.isArray(user.history) && user.history.length ? user.history.join(", ") : user.vote || "NO VOTE";
      const baitCount = user.baitCount || 0;
      const baitSuffix = baitCount > 0 ? ` (Fell for bait ${baitCount} ${baitCount === 1 ? "time" : "times"})` : "";
      return `<div class="secret-row"><span>${escapeHtml(user.username)}</span><span>${escapeHtml(history)}${baitSuffix}</span></div>`;
    })
    .join("");

  list.innerHTML = rows || "<p class='small'>No saved users.</p>";
  count.textContent = `Stored accounts: ${users.length}`;
  if (notice) {
    notice.textContent = `Fell for DON'T CLICK: ${users.filter((user) => user.baitCount > 0).length}`;
  }
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
