const letters = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let interval = null;

// Function to attach glitch effect to all h1.glitch-text
function attachGlitchEffect() {
    document.querySelectorAll("h1.glitch-text").forEach(h1 => {
      let interval = null;  // Declare interval here so it's specific to each h1 element
      let iteration = 0;    // Declare iteration specific to each h1 element
  
      h1.onmouseover = event => {
        // Clear the previous interval when mouse enters a new h1
        iteration = 0;
        clearInterval(interval);
  
        interval = setInterval(() => {
          event.target.innerText = event.target.innerText
            .split("")
            .map((letter, index) => {
              if (index < iteration + 1) {
                return event.target.dataset.value[index];
              }
              return letters[Math.floor(Math.random() * 26)];
            })
            .join("");
  
          if (iteration >= event.target.dataset.value.length) {
            clearInterval(interval); // Stop the interval when the text is fully restored
          }
  
          iteration += 1 / 3;  // Adjust the speed of animation
        }, 10);
      };
    });
  }
  
// /*===== MENU SHOW Y HIDDEN =====*/ 
// const navMenu = document.getElementById('nav-menu'),
//       toggleMenu = document.getElementById('nav-toggle'),
//       closeMenu = document.getElementById('nav-close')

// /*SHOW*/ 
// toggleMenu.addEventListener('click', ()=>{
//     navMenu.classList.toggle('show')
// })

// /*HIDDEN*/
// closeMenu.addEventListener('click', ()=>{
//     navMenu.classList.remove('show')
// })

/*===== ACTIVE AND REMOVE MENU =====*/
const navLink = document.querySelectorAll('.nav_link');   

function linkAction(){
  /*Active link*/
  navLink.forEach(n => n.classList.remove('active'));
  this.classList.add('active');
  
  /*Remove menu mobile*/
  navMenu.classList.remove('show')
}
navLink.forEach(n => n.addEventListener('click', linkAction));


const content = document.getElementById("content");

window.addEventListener('DOMContentLoaded', () => {
    loadPage("pages/home.html");
    attachGlitchEffect();
  });

document.querySelectorAll(".nav_link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
  
      const page = link.getAttribute("href"); // "about", "projects", etc.
      loadPage(page);
    });
  });
  
function loadPage(page) {
    fetch(page)
      .then(response => {
        if (!response.ok) {
          throw new Error("404");
        }
        return response.text();
      })
      .then(html => {
        content.innerHTML = html;
        attachGlitchEffect();
      })
      .catch(() => {
        content.innerHTML = "<h1>404</h1><p>Page not found</p>";
      });
  }
