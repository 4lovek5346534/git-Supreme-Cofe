document.getElementById('search-form').addEventListener('submit', function (event) {
    const query = document.getElementById('search-query').value.trim();
    
    if (query.length === 0) {
        event.preventDefault(); 
        window.location.href = '/catalog'; 
        localStorage.removeItem('searchQuery');
        return;
    }
    
    localStorage.setItem('searchQuery', query);
});

window.onload = function() {
    const savedQuery = localStorage.getItem('searchQuery');
    if (savedQuery) {
        document.getElementById('search-query').value = savedQuery;
    }
};
