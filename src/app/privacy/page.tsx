import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Политика конфиденциальности</h1>

        <div className="prose prose-invert prose-sm max-w-none">
          <div className="space-y-8 text-white/70">

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Общие положения</h2>
              <p className="mb-3">
                1.1. Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных
                данных пользователей сервиса doska.ai (далее — «Платформа»).
              </p>
              <p className="mb-3">
                1.2. Используя Платформу, Пользователь выражает согласие с условиями настоящей Политики.
                Если Пользователь не согласен с условиями, он должен прекратить использование Платформы.
              </p>
              <p className="mb-3">
                1.3. Платформа обрабатывает персональные данные в соответствии с Федеральным законом
                № 152-ФЗ «О персональных данных» от 27.07.2006.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Собираемые данные</h2>
              <p className="mb-3">
                2.1. При регистрации и использовании Платформы могут собираться следующие данные:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3 ml-4">
                <li>ФИО или наименование организации</li>
                <li>Адрес электронной почты</li>
                <li>Номер телефона</li>
                <li>ИНН (для юридических лиц)</li>
                <li>Данные об использовании сервиса (просмотры, запросы, загрузки)</li>
                <li>IP-адрес и данные браузера</li>
                <li>Cookies и аналогичные технологии</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Цели обработки данных</h2>
              <p className="mb-3">
                3.1. Персональные данные обрабатываются в следующих целях:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3 ml-4">
                <li>Идентификация пользователя и предоставление доступа к сервису</li>
                <li>Обработка платежей и выставление счетов</li>
                <li>Связь с пользователем по вопросам использования сервиса</li>
                <li>Улучшение качества сервиса и разработка новых функций</li>
                <li>Отправка информационных и рекламных сообщений (с согласия пользователя)</li>
                <li>Выполнение требований законодательства РФ</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Передача данных третьим лицам</h2>
              <p className="mb-3">
                4.1. Платформа не продаёт и не передаёт персональные данные третьим лицам, за исключением случаев:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3 ml-4">
                <li>Наличия явного согласия пользователя</li>
                <li>Требования законодательства РФ (по запросу государственных органов)</li>
                <li>Передачи данных платёжным системам для обработки оплаты</li>
                <li>Передачи обезличенных данных для аналитики</li>
              </ul>
              <p className="mb-3">
                4.2. Контактные данные пользователей, размещающих объявления, могут быть доступны
                другим пользователям Платформы в рамках оказания услуг.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Защита данных</h2>
              <p className="mb-3">
                5.1. Платформа принимает необходимые организационные и технические меры для защиты
                персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.
              </p>
              <p className="mb-3">
                5.2. Меры защиты включают:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3 ml-4">
                <li>Шифрование данных при передаче (SSL/TLS)</li>
                <li>Ограничение доступа сотрудников к персональным данным</li>
                <li>Регулярное обновление систем безопасности</li>
                <li>Хранение данных на защищённых серверах</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Cookies</h2>
              <p className="mb-3">
                6.1. Платформа использует файлы cookies для:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3 ml-4">
                <li>Авторизации пользователей и сохранения сессии</li>
                <li>Сохранения настроек и предпочтений</li>
                <li>Сбора статистики использования (Google Analytics, Яндекс.Метрика)</li>
                <li>Показа релевантной рекламы</li>
              </ul>
              <p className="mb-3">
                6.2. Пользователь может отключить cookies в настройках браузера, однако это может
                ограничить функциональность сервиса.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Права пользователя</h2>
              <p className="mb-3">
                7.1. Пользователь имеет право:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-3 ml-4">
                <li>Получить информацию о своих персональных данных, обрабатываемых Платформой</li>
                <li>Требовать уточнения, блокирования или уничтожения персональных данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
                <li>Обжаловать действия Платформы в уполномоченный орган (Роскомнадзор)</li>
              </ul>
              <p className="mb-3">
                7.2. Для реализации своих прав пользователь может направить запрос на адрес info@doska.ai.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Срок хранения данных</h2>
              <p className="mb-3">
                8.1. Персональные данные хранятся в течение срока действия учётной записи пользователя
                и 3 (трёх) лет после её удаления.
              </p>
              <p className="mb-3">
                8.2. Данные о платежах хранятся в соответствии с требованиями бухгалтерского
                и налогового законодательства РФ.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Изменение политики</h2>
              <p className="mb-3">
                9.1. Платформа оставляет за собой право изменять настоящую Политику конфиденциальности.
              </p>
              <p className="mb-3">
                9.2. Новая редакция Политики вступает в силу с момента её размещения на сайте,
                если иное не предусмотрено новой редакцией.
              </p>
              <p className="mb-3">
                9.3. Действующая редакция всегда доступна по адресу
                <a href="/privacy" className="text-blue-400 hover:underline ml-1">/privacy</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Контакты</h2>
              <p className="mb-3">
                По вопросам, связанным с обработкой персональных данных, обращайтесь:
              </p>
              <ul className="list-none space-y-2 mb-3">
                <li>Email: <a href="mailto:info@doska.ai" className="text-blue-400 hover:underline">info@doska.ai</a></li>
                <li>Telegram: <a href="https://t.me/doskaai" className="text-blue-400 hover:underline">@doskaai</a></li>
              </ul>
            </section>

            <section className="pt-6 border-t border-white/10">
              <p className="text-white/50 text-sm">
                Дата публикации: 1 января 2024 года<br />
                Последнее обновление: 1 января 2024 года
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
