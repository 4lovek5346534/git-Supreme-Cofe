const fs = require('fs');
const path = require('path');

function deleteFile(filePath) {
    const fullPath = path.resolve(filePath); // Преобразуем относительный путь в абсолютный

    // Проверяем, существует ли файл
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error("Файл не существует:", fullPath);
        } else {
            // Если файл существует, удаляем его
            fs.unlink(fullPath, (err) => {
                if (err) {
                    console.error("Ошибка при удалении файла:", err);
                } else {
                    console.log("Файл успешно удалён:", fullPath);
                }
            });
        }
    });
}