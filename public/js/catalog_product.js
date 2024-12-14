document.querySelectorAll('.product-box').forEach(button => {
    button.addEventListener('click', (event) => {
        const productElement = event.currentTarget.closest('.product-box'); 
        const productId = productElement.dataset.id;
        const name = productElement.dataset.name;
        if (!event.target.classList.contains('add-cart')) {
        if (productId && name) {
            window.location.href = `/catalog/${name}/${productId}`;
        } else {
            console.error('Не удалось получить ID или имя продукта');
        }}
    });
});