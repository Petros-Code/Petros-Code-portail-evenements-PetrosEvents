/**
 * Gestionnaire principal de l'application
 * Initialise toutes les fonctionnalités au chargement de la page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Configuration du thème
    initializeTheme();
    
    // Configuration de la modale
    initializeModal();
    
    // Configuration des favoris
    initializeFavorites();
    
    // Chargement des événements
    fetchEvents();
});

/**
 * Gère les cookies
 */
const CookieManager = {
    /**
     * Définit un cookie
     * @param {string} name - Nom du cookie
     * @param {string} value - Valeur du cookie
     * @param {number} days - Durée de validité en jours
     */
    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/`;
    },

    /**
     * Récupère la valeur d'un cookie
     * @param {string} name - Nom du cookie
     * @returns {string|null} Valeur du cookie ou null si non trouvé
     */
    getCookie(name) {
        const cookieName = `${name}=`;
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length);
            }
        }
        return null;
    }
};

/**
 * Initialise le système de thème clair/sombre
 */
function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Récupérer le thème depuis le cookie ou utiliser 'light' par défaut
    const savedTheme = CookieManager.getCookie('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        themeToggle.textContent = newTheme === 'light' ? '☀️' : '🌙';
        
        // Sauvegarder le thème dans un cookie valable 1 an
        CookieManager.setCookie('theme', newTheme, 365);
    });
}

/**
 * Initialise la modale de détails des événements
 */
function initializeModal() {
    const modal = document.getElementById('event-modal');
    const closeModal = document.querySelector('.close-modal');

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * Initialise le système de favoris
 */
function initializeFavorites() {
    window.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    window.toggleFavorite = toggleFavorite;
}

/**
 * Gère l'ajout/suppression d'un événement des favoris
 * @param {number} eventId - ID de l'événement
 * @param {Object} event - Données de l'événement
 */
function toggleFavorite(eventId, event) {
    const index = favorites.findIndex(fav => fav.id === eventId);
    if (index === -1) {
        favorites.push(event);
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    updateFavoritesDisplay();
    updateFavoriteStars();
}

/**
 * Met à jour l'affichage des favoris
 */
function updateFavoritesDisplay() {
    const favoritesContainer = document.getElementById('favorites-container');
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = '<p class="no-favorites">Aucun événement dans votre planning</p>';
        return;
    }

    favoritesContainer.innerHTML = favorites.map(event => createEventCard(event, true)).join('');
}

/**
 * Met à jour l'état des étoiles de favoris
 */
function updateFavoriteStars() {
    const favoriteButtons = document.querySelectorAll('.favorite-button');
    favoriteButtons.forEach(button => {
        const eventId = parseInt(button.getAttribute('data-event-id'));
        const isFavorited = favorites.some(fav => fav.id === eventId);
        button.classList.toggle('active', isFavorited);
        button.innerHTML = isFavorited ? '★' : '☆';
    });
}

/**
 * Crée le HTML d'une carte d'événement
 * @param {Object} event - Données de l'événement
 * @param {boolean} isFavorite - Indique si l'événement est dans les favoris
 * @returns {string} HTML de la carte
 */
function createEventCard(event, isFavorite = false) {
    const isFavorited = favorites.some(fav => fav.id === event.id);
    return `
        <div class="event-card">
            ${event.image ? `<img src="${event.image.url}" alt="${event.title}" class="event-image">` : ''}
            <div class="event-content">
                <div class="event-header">
                    <div class="event-title-container">
                        <h3 class="event-title">${event.title}</h3>
                    </div>
                    <button class="favorite-button ${isFavorited ? 'active' : ''}" 
                            data-event-id="${event.id}"
                            onclick="toggleFavorite(${event.id}, ${JSON.stringify(event).replace(/"/g, '&quot;')})">
                        ${isFavorited ? '★' : '☆'}
                    </button>
                </div>
                <p class="event-date">
                    ${new Date(event.start_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
                <p class="event-description">${event.description.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                <div class="event-actions">
                    <a href="${event.url}" target="_blank" class="event-link">Voir l'événement</a>
                    <button class="details-button" onclick="showEventDetails(${JSON.stringify(event).replace(/"/g, '&quot;')})">Détails</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Récupère et affiche les événements depuis l'API
 */
async function fetchEvents() {
    const eventsContainer = document.getElementById('events-container');
    
    try {
        const response = await fetch('https://demo.theeventscalendar.com/wp-json/tribe/events/v1/events');
        const data = await response.json();
        
        if (data.events && data.events.length > 0) {
            eventsContainer.innerHTML = data.events.map(event => createEventCard(event)).join('');
            updateFavoritesDisplay();
            updateFavoriteStars();
        } else {
            eventsContainer.innerHTML = '<p>Aucun événement disponible pour le moment.</p>';
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des événements:', error);
        eventsContainer.innerHTML = '<p>Une erreur est survenue lors du chargement des événements.</p>';
    }
}

/**
 * Affiche les détails d'un événement dans la modale
 * @param {Object} event - Données de l'événement
 */
window.showEventDetails = function(event) {
    const modal = document.getElementById('event-modal');
    const modalContent = document.getElementById('modal-content');
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    modalContent.innerHTML = `
        <div class="modal-details">
            <h2 class="modal-title">${event.title}</h2>
            
            <div class="modal-section">
                <h3>Description</h3>
                <p>${event.description.replace(/<[^>]*>/g, '')}</p>
            </div>

            <div class="modal-section">
                <h3>Date et Heure</h3>
                <p>Du ${startDate.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
                <p>Au ${endDate.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
            </div>

            <div class="modal-section">
                <h3>Lieu</h3>
                <p>${event.venue ? `
                    ${event.venue.venue}<br>
                    ${event.venue.address}<br>
                    ${event.venue.zip} ${event.venue.city}<br>
                    ${event.venue.country}
                ` : 'Lieu non spécifié'}</p>
            </div>

            <div class="modal-section">
                <h3>Lien externe</h3>
                <a href="${event.url}" target="_blank" class="modal-link">Voir l'événement sur le site source</a>
            </div>
        </div>
    `;
    modal.style.display = 'block';
};
