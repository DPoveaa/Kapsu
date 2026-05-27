import { Link } from 'react-router-dom'
import { PackagePlus, ShoppingBag, Settings, ArrowRight, Truck, Image as ImageIcon } from 'lucide-react'

export default function AdminPanel() {
  const quickActions = [
    {
      title: "Adicionar Produto",
      description: "Cadastre um novo item no catálogo.",
      icon: PackagePlus,
      link: "/admin/products/create",
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
    },
    {
      title: "Ver Pedidos",
      description: "Gerencie vendas recentes.",
      icon: ShoppingBag,
      link: "/admin/orders",
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
    },
    {
      title: "Personalizar Banners",
      description: "Altere o visual da página inicial.",
      icon: ImageIcon,
      link: "/admin/banners",
      color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
    },
    {
      title: "Taxas de Frete",
      description: "Ajuste os valores de entrega.",
      icon: Truck,
      link: "/admin/shipping",
      color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 lg:mb-10 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20 dark:bg-opacity-5 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Painel Administrativo</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 text-lg">Bem-vindo(a) à central de gestão da Sanare.</p>
        </div>
        <div className="hidden sm:block relative z-10">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-2xl flex items-center justify-center transform rotate-3">
            <Settings className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ações Rápidas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Acesso direto às tarefas mais frequentes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            to={action.link}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800 hover:-translate-y-1 flex flex-col h-full"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${action.color}`}>
              <action.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {action.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow">
              {action.description}
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-primary-600 dark:text-primary-400">
              Acessar
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-6 sm:p-8 border border-primary-100 dark:border-primary-900/50">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Utilize o Menu Lateral</h2>
        <p className="text-gray-600 dark:text-gray-300">
          A partir de agora, toda a navegação principal da sua loja está disponível de forma contínua no menu à esquerda. 
          Isso permite que você alterne entre pedidos, produtos e configurações sem precisar voltar à tela inicial.
        </p>
      </div>
    </div>
  )
}
