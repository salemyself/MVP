import google.generativeai as genai
import json

def configure_gemini(api_key):
    genai.configure(api_key=api_key)

def generate_response(essay_text, requirements_text):
    # Change the model name here
    model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')
    # ... rest of your function remains the same ...

    # Формируем системный промпт
    system_prompt = """Ты - помощник преподавателя для проверки студенческих работ.
    Проверь эссе по следующим критериям и предоставь развернутую обратную связь.
    Формат ответа должен быть в виде JSON с полями: score (оценка), feedback (обратная связь)."""

    # Формируем контекст диалога using dictionary structure
    contents = [
        {
            "role": "user",
            "parts": [{"text": system_prompt}],
        },
        {
            "role": "model",
            "parts": [{"text": """{
                "score_scale": "10",
                "feedback_focus": ["структура", "логика", "содержание", "язык"]
            }"""}],
        },
        {
            "role": "user",
            "parts": [{"text": f"""Эссе для проверки:
            {essay_text}

            Требования к проверке:
            {requirements_text}

            Проанализируй работу и предоставь развернутый ответ в указанном формате."""}],
        }
    ]

    try:
        response = model.generate_content(
            contents=contents,
            generation_config={"response_mime_type": "application/json"}
        )

        # Парсим JSON ответ
        response_json = json.loads(response.text)
        return format_response(response_json)

    except Exception as e:
        print(f"Ошибка при генерации ответа: {str(e)}")
        # Return a structured error response for the frontend
        return {
            "error": f"Произошла ошибка при обработке запроса: {str(e)}", # Include error for debugging
            "score": "N/A",
            "feedback": f"Не удалось получить ответ от ИИ.",
            "improvements": ["Проверьте логи сервера или попробуйте позже."]
        }

def format_response(response_data):
    """Форматируем ответ для отображения в интерфейсе"""
    # Check for the structured error
    if 'error' in response_data and 'score' in response_data:
         return {"response": f"""
        <strong>Результат проверки:</strong><br>
        <strong style="color: red;">Ошибка:</strong> {response_data['error']}<br><br>
        <strong>Обратная связь:</strong><br>
        {response_data['feedback']}<br><br>
        """}

    # Check for a generic error key if structured error isn't present
    if 'error' in response_data:
         return {"response": f"""
        <strong>Результат проверки:</strong><br>
        <strong style="color: red;">Ошибка:</strong> {response_data['error']}<br><br>
        <strong>Обратная связь:</strong><br>
        Произошла ошибка при обработке ответа.
        """}


    score = response_data.get('score', 'не указана')
    feedback = response_data.get('feedback', 'Нет обратной связи')

    formatted_text = f"""
    <strong>Результат проверки:</strong><br>
    <strong>Оценка:</strong> {score}/10<br><br>
    <strong>Обратная связь:</strong><br>
    {feedback}<br><br>
    """

    return {"response": formatted_text} # Wrap in 'response' key