document.querySelectorAll('.product').forEach(button => {
    button.addEventListener('click', (event) => {
        const productElement = event.currentTarget.closest('.product'); 
        const productId = productElement.dataset.id;
        const name = productElement.dataset.name;
        
        if (productId && name) {
            window.location.href = `/catalog/${name}/${productId}`;
        } else {
            console.error('Не удалось получить ID или имя продукта');
        }
    });
});