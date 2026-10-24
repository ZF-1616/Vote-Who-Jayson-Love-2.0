const SUPABASE_URL = "https://katosmlcvogcrkltplci.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WDomn2dsEOAoZ1Y3nn_Uqg_ii4oNSgC";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

//og code start here
const USERS_KEY = "voteWhoMing_users";
const CURRENT_USER_KEY = "voteWhoMing_currentUser";

window.addEventListener("load", () => {
  if (document.getElementById("login-card")) {
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

async function initializeLoginPage() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);
    return;
  }

  const session = data.session;

  if (session) {
    const username =
      session.user.user_metadata?.username ||
      session.user.email?.split("@")[0] ||
      "Voter";

    showVotePanel(username);
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


async function login() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const message = document.getElementById("login-message");

  message.textContent = "";

  if (!email || !password) {
    message.textContent = "Please enter your email and password.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = "Login failed: " + error.message;
    return;
  }

  const username =
    data.user.user_metadata?.username ||
    data.user.email?.split("@")[0] ||
    "Voter";

  showVotePanel(username);
}

async function signup() {
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value;
  const email = document.getElementById("signup-email").value.trim();
  const confirm = document.getElementById("signup-confirm").value;
  const message = document.getElementById("signup-message");

  message.textContent = "";

  if (!username || !email || !password || !confirm) {
    message.textContent = "Please fill in every field.";
    return;
  }

  if (password.length < 6) {
    message.textContent = "Password must be at least 6 characters.";
    return;
  }

  if (password !== confirm) {
    message.textContent = "Passwords do not match.";
    return;
  }

  message.textContent = "Creating your account...";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username
      }
    }
  });

  if (error) {
    message.textContent = "Signup failed: " + error.message;
    return;
  }

  if (data.session) {
    message.textContent = "Account created! Redirecting...";
    window.location.href = "index.html";
  } else {
    message.textContent =
      "Account created! Please check your email to confirm your account, then log in.";
  }
}


function showVotePanel(username) {
  const loginCard = document.getElementById("login-card");
  const voteCard = document.getElementById("vote-card");
  const greeting = document.getElementById("greeting");
  const previousChoice = document.getElementById("previous-choice");

  if (loginCard) loginCard.classList.add("hidden");
  if (voteCard) voteCard.classList.remove("hidden");
  if (greeting) greeting.textContent = `Welcome, ${username}`;

  // Cloud vote history will be connected in the next step.
  if (previousChoice) previousChoice.textContent = "Loading soon...";
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);
    return;
  }

  window.location.reload();
}

async function vote(choice) {
  const feedback = document.getElementById("vote-feedback");

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    if (feedback) {
      feedback.textContent = "Please log in before voting.";
    }
    return;
  }

  const user = sessionData.session.user;
  const userId = user.id;
  const username =
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "Voter";

  const validChoices = [
    "A. 1001",
    "B. M·F",
    "C. 0203",
    "D. No One",
    "E. DON'T CLICK !!!"
  ];

  if (!validChoices.includes(choice)) {
    if (feedback) feedback.textContent = "Invalid vote choice.";
    return;
  }

  if (feedback) feedback.textContent = "Saving your vote...";

  // Get the user's previous vote.
  const { data: previousData, error: previousError } =
    await supabaseClient
      .from("votes")
      .select("choice")
      .eq("user_id", userId)
      .maybeSingle();

  if (previousError) {
    console.error("Could not load previous vote:", previousError);
    if (feedback) {
      feedback.textContent =
        "Could not load your previous vote: " + previousError.message;
    }
    return;
  }

  const previousVote = previousData?.choice || null;
  const baited = choice === "E. DON'T CLICK !!!";

  // Save or update the user's current vote.
  const { error: voteError } = await supabaseClient
    .from("votes")
    .upsert(
      {
        user_id: userId,
        choice: choice,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (voteError) {
    console.error("Vote save failed:", voteError);
    if (feedback) {
      feedback.textContent = "Could not save vote: " + voteError.message;
    }
    return;
  }

  // Add an entry to the vote history.
  const { error: historyError } = await supabaseClient
    .from("vote_history")
    .insert({
      user_id: userId,
      choice: choice,
      baited: baited
    });

  if (historyError) {
    console.error("History save failed:", historyError);
    if (feedback) {
      feedback.textContent =
        "Vote saved, but history failed: " + historyError.message;
    }
    return;
  }

  setSelectedVote(choice);

  const previousChoice = document.getElementById("previous-choice");
  if (previousChoice) previousChoice.textContent = choice;

  if (feedback) {
    feedback.textContent =
      previousVote === choice
        ? `You already selected ${choice}. Your history has been updated.`
        : `Thanks, ${username}! You voted for ${choice}.`;
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
